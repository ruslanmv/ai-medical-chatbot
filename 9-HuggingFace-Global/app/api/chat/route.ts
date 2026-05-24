import { NextRequest } from 'next/server';
import { z } from 'zod';
import { chatWithFallback, AllProvidersUnavailableError, type ChatMessage } from '@/lib/providers';
import { getEmergencyInfo } from '@/lib/safety/emergency-numbers';
import { preCheck, postCheck } from '@/lib/safety/safety-engine';
import { snapshotFlags } from '@/lib/feature-flags';

// Log feature-flag snapshot once per process load so deployments make their
// configured behavior visible. Values are server-side only and PHI-free.
console.log(`[Chat] route.flags ${JSON.stringify(snapshotFlags())}`);
import { buildRAGContext } from '@/lib/rag/medical-kb';
import { buildMedicalSystemPrompt } from '@/lib/medical-knowledge';
import { authenticateRequest } from '@/lib/auth-middleware';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { auditLog } from '@/lib/audit';
import {
  buildPatientContextForUser,
  stripInjectedPatientContext,
} from '@/lib/patient-context.server';

const RequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string(),
    })
  ),
  model: z.string().optional().default('qwen2.5:1.5b'),
  language: z.string().optional().default('en'),
  countryCode: z.string().optional().default('US'),
});

export async function POST(request: NextRequest) {
  const routeStartedAt = Date.now();
  const ip = getClientIp(request);
  const user = authenticateRequest(request);

  // Per-identity chat rate limit. Authenticated users get a generous
  // 60 turns/min by user id (stable across IPs), anonymous get 20/min
  // by IP. The limiter is in-memory per process; for multi-instance
  // deployments swap to Redis (same interface).
  const limitKey = user ? `chat:user:${user.id}` : `chat:ip:${ip}`;
  const limitMax = user ? 60 : 20;
  const limit = checkRateLimit(limitKey, limitMax, 60_000);
  if (!limit.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Chat rate limit exceeded. Please slow down.',
        retryAfterMs: limit.retryAfterMs,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)),
        },
      },
    );
  }

  try {
    const body = await request.json();
    const { messages, model, language, countryCode } = RequestSchema.parse(body);

    // Single-line JSON payload so the HF Space logs API (SSE) can be grepped
    // with a simple prefix match. Every stage below tags itself `[Chat]`.
    console.log(
      `[Chat] route.enter ${JSON.stringify({
        userId: user?.id || null,
        turns: messages.length,
        model,
        language,
        countryCode,
        userAgent: request.headers.get('user-agent')?.slice(0, 80) || null,
      })}`,
    );

    // Step 1: Emergency triage on the latest user message.
    // Sanitise FIRST: strip any client-injected [Patient: ...] block so
    // (a) the triage check sees only the user's real prose, and
    // (b) we cannot leak another user's EHR into the LLM if a stale or
    //     malicious client sends one.
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
    const rawUserContent = lastUserMessage?.content || '';
    const cleanUserContent = stripInjectedPatientContext(rawUserContent);

    // Step 1: Run the deterministic safety pre-check. This is the FLOOR;
    // the LLM cannot relax it. The engine returns either an emergency
    // template (R5 — LLM not called) or a green-light decision with a
    // risk class and a system-prompt augmentation that pins policy.
    let safetyDecision: ReturnType<typeof preCheck> | null = null;
    if (lastUserMessage) {
      safetyDecision = preCheck({
        text: cleanUserContent,
        countryCode,
      });

      console.log(
        `[Chat] route.safety.preCheck ${JSON.stringify({
          userId: user?.id || null,
          riskClass: safetyDecision.audit.riskClass,
          ruleFires: safetyDecision.audit.ruleFires,
          userChars: cleanUserContent.length,
        })}`,
      );

      // Emergency-template path — DO NOT short-circuit the LLM anymore.
      //
      // Old behaviour: when preCheck() returned `emergency_template` we
      // returned a fixed string and never called the model. This is
      // exactly the "hardcoded answer" complaint: users saw a canned
      // "This may be a heart attack…" reply and never got real LLM
      // reasoning, even for non-trivial follow-ups.
      //
      // New behaviour: we capture the deterministic emergency banner
      // here and let the request flow into the normal LLM path. The
      // banner is then prepended to the LLM response in the safeStream
      // assembly below. If the LLM fails we still deliver the banner
      // alone (the safety floor never disappears) — never a 503.
      //
      // The deterministic floor (banner text + emergency number) is
      // still authored by the safety engine, not the model, so a
      // hallucinating LLM cannot weaken it. The LLM can only ADD
      // medical reasoning *after* the banner.
    }
    const emergencyBanner =
      safetyDecision?.kind === 'emergency_template' ? safetyDecision.template : '';
    const emergencyRuleFires =
      safetyDecision?.kind === 'emergency_template' ? safetyDecision.audit.ruleFires : [];
    const isEmergency = !!emergencyBanner;

    // Step 2: Build RAG context from the medical knowledge base.
    const ragStart = Date.now();
    const ragContext = lastUserMessage ? buildRAGContext(cleanUserContent) : '';
    console.log(
      `[Chat] route.rag ${JSON.stringify({
        userId: user?.id || null,
        chars: ragContext.length,
        latencyMs: Date.now() - ragStart,
      })}`,
    );

    // Step 3: Server-built patient context, scoped to the authenticated
    // user. Anonymous chats receive no per-user EHR — they get a generic
    // medical assistant. This is the isolation contract.
    const patientContext = user ? buildPatientContextForUser(user.id) : '';

    // Step 4: Build a structured, locale-aware system prompt that grounds
    // the model in WHO/CDC/NHS guidance and pins the response language,
    // country, emergency number, and measurement system. Append the
    // safety-engine policy block so the LLM is aware of the deterministic
    // floor — the post-filter is the second line of defence.
    const emergencyInfo = getEmergencyInfo(countryCode);
    const baseSystemPrompt = buildMedicalSystemPrompt({
      country: countryCode,
      language,
      emergencyNumber: emergencyInfo.emergency,
    });
    // Stack the system instructions: base + allow-llm hints + emergency
    // augmentation. Emergency augmentation tells the LLM the deterministic
    // banner has ALREADY been shown to the user, so the LLM should produce
    // additive reasoning (what to do next, what to bring to the ER, when
    // every minute matters, etc.) rather than re-issuing the call-911 text.
    let systemPrompt = baseSystemPrompt;
    if (safetyDecision && safetyDecision.kind === 'allow_llm') {
      systemPrompt += `\n\n${safetyDecision.systemInstructions}`;
    }
    if (isEmergency) {
      systemPrompt +=
        `\n\n[EMERGENCY SAFETY FLOOR]\n` +
        `The user has triggered red-flag rules: ${emergencyRuleFires.join(', ')}.\n` +
        `A deterministic emergency banner has been shown to the user FIRST. It instructs them to call ${emergencyInfo.emergency} immediately.\n` +
        `Your task is to ADD short, useful medical reasoning AFTER the banner:\n` +
        `  • acknowledge the urgency\n` +
        `  • give concrete next steps (what to do while waiting, what to bring, what to tell responders)\n` +
        `  • do NOT contradict, soften, or repeat the banner\n` +
        `  • keep it under 6 sentences\n`;
    }

    // Step 5: Assemble the final message list. Prior turns are passed through
    // verbatim except for the LAST user turn, which is rebuilt with:
    //    sanitised user prose + server-built [Patient: ...] + retrieved RAG
    // in that order. The LLM sees patient context BEFORE reference material,
    // matching the prior client-side ordering.
    const priorMessages = messages.slice(0, -1).map((m) =>
      m.role === 'user'
        ? { ...m, content: stripInjectedPatientContext(m.content) }
        : m,
    );

    const finalUserContent = [
      cleanUserContent,
      patientContext, // already starts with '\n[Patient: ...]' or ''
      ragContext
        ? `\n\n[Reference material retrieved from the medical knowledge base — use if relevant]\n${ragContext}`
        : '',
    ].join('');

    const augmentedMessages: ChatMessage[] = [
      { role: 'system' as const, content: systemPrompt },
      ...priorMessages,
      { role: 'user' as const, content: finalUserContent },
    ];

    // Step 6: Stream response via the provider fallback chain.
    console.log(
      `[Chat] route.provider.dispatch ${JSON.stringify({
        userId: user?.id || null,
        systemPromptChars: systemPrompt.length,
        patientContextChars: patientContext.length,
        totalMessages: augmentedMessages.length,
        preparedInMs: Date.now() - routeStartedAt,
      })}`,
    );
    // Step 6: Buffer-then-filter-then-stream.
    //
    // The deterministic post-filter must run on the COMPLETE model response
    // before any of it reaches the user. We therefore call the non-streaming
    // provider, run postCheck(), and re-emit the filtered text as a single
    // SSE chunk so the existing client SSE parser keeps working.
    //
    // ALL risk classes — including R5 — call the LLM. The deterministic
    // banner is still authored by the safety engine and is prepended below;
    // the LLM only ADDS clinical reasoning AFTER the banner (next steps,
    // what to tell EMS, what to bring). This eliminates the "every
    // chest-pain question gets the same canned reply" complaint while
    // keeping the safety floor non-negotiable: if the LLM returns nothing,
    // or returns text that the post-filter strips, the banner stands alone.
    //
    // For emergencies, the system-prompt augmentation ([EMERGENCY SAFETY
    // FLOOR] block in Step 4 above) tells the model that the banner has
    // already been shown and constrains it to ≤6 sentences of additive
    // advice. With Groq llama-3.3-70b-versatile as primary this is
    // reliable; the old failure mode (qwen2.5:0.5b ignoring length caps
    // and inventing dangerous advice) is no longer in the hot path.
    let providerResponse: { content: string; provider: string; model: string };
    try {
      providerResponse = await chatWithFallback(augmentedMessages, model);
    } catch (chainErr: any) {
      const isUnavailable =
        chainErr instanceof AllProvidersUnavailableError;
      console.warn(
        `[Chat] route.provider.degraded reason=${
          isUnavailable ? 'all_providers_failed' : 'unexpected_error'
        } emergency=${isEmergency} msg=${String(
          chainErr?.message || chainErr,
        ).slice(0, 200)}`,
      );
      if (isEmergency) {
        // Safety floor never disappears. If every provider is down on an
        // emergency turn, the deterministic banner alone is the answer —
        // it already routes the user to EMS and lists do-while-waiting
        // steps. No conversational hedge is appropriate here.
        providerResponse = {
          content: '',
          provider: 'safety-engine',
          model: 'emergency-template',
        };
      } else {
        providerResponse = {
          content:
            "I'm having trouble reaching the medical AI right now. " +
            "Please try again in a moment. If this is urgent, contact " +
            `your healthcare provider or call ${emergencyInfo.emergency} ` +
            `(${emergencyInfo.country}).`,
          provider: 'safety-engine',
          model: 'graceful-degradation',
        };
      }
    }

    const riskClass = safetyDecision?.kind === 'allow_llm'
      ? safetyDecision.riskClass
      : (isEmergency ? 'R5' : 'R0');

    const post = postCheck({
      response: providerResponse.content,
      riskClass,
      emergency: emergencyInfo,
      // Suppress the post-filter's "see a primary-care doctor" append
      // when we're already showing the emergency floor — that floor
      // routes the user to emergency services, and a GP referral on
      // top of it is misdirection (e.g. on a suspected MI).
      isEmergencyTemplatePath: isEmergency,
    });

    // Prepend the emergency banner so the user always sees the safety
    // floor first, then the LLM's medical reasoning underneath.
    const finalContent = isEmergency
      ? (post.filtered
          ? `${emergencyBanner}\n\n${post.filtered}`
          : emergencyBanner)
      : post.filtered;

    console.log(
      `[Chat] route.safety.postCheck ${JSON.stringify({
        userId: user?.id || null,
        riskClass,
        filterFires: post.audit.filterFires,
        modified: post.audit.modified,
        blocked: post.audit.blocked,
        totalMs: Date.now() - routeStartedAt,
      })}`,
    );

    const encoder = new TextEncoder();
    const safeStream = new ReadableStream({
      start(controller) {
        const data = JSON.stringify({
          choices: [{ delta: { content: finalContent } }],
          provider: providerResponse.provider,
          model: providerResponse.model,
          riskClass,
          filtered: post.audit.modified,
          isEmergency,
          ruleFires: emergencyRuleFires,
        });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    if (user) {
      auditLog({
        userId: user.id,
        action: 'chat',
        ip,
        meta: {
          model: providerResponse.model,
          provider: providerResponse.provider,
          countryCode,
          turns: messages.length,
          patientContextChars: patientContext.length,
          riskClass,
          ruleFires: safetyDecision?.audit.ruleFires ?? [],
          filterFires: post.audit.filterFires,
          filterModified: post.audit.modified,
          filterBlocked: post.audit.blocked,
        },
      });
    }

    return new Response(safeStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error(
      `[Chat] route.error ${JSON.stringify({
        userId: user?.id || null,
        totalMs: Date.now() - routeStartedAt,
        name: (error as any)?.name,
        message: String((error as any)?.message || error).slice(0, 200),
      })}`,
    );

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Invalid request', details: error.errors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // When every LLM provider has failed we surface a 503 with a
    // plain-language message. useChat shows this verbatim in the chat
    // bubble; the proxy + 503 status also lets the frontend's existing
    // backend-availability handling kick in.
    if (error instanceof AllProvidersUnavailableError) {
      return new Response(
        JSON.stringify({
          error: error.message,
          code: 'all_providers_unavailable',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
