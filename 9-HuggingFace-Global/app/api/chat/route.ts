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

      if (safetyDecision.kind === 'emergency_template') {
        // Capture the narrowed values before entering the ReadableStream
        // callback — discriminated-union narrowing on `safetyDecision`
        // does not survive into the inner closure under strict TS.
        const emergencyTemplate = safetyDecision.template;
        const emergencyRuleFires = safetyDecision.audit.ruleFires;

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            const data = JSON.stringify({
              choices: [{ delta: { content: emergencyTemplate } }],
              provider: 'safety-engine',
              model: 'emergency-template',
              isEmergency: true,
              riskClass: 'R5',
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
              riskClass: 'R5',
              ruleFires: emergencyRuleFires,
              countryCode,
              model: 'emergency-template',
            },
          });
        }

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      }
    }

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
    const systemPrompt =
      safetyDecision && safetyDecision.kind === 'allow_llm'
        ? `${baseSystemPrompt}\n\n${safetyDecision.systemInstructions}`
        : baseSystemPrompt;

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
    // This adds end-to-end latency relative to mid-stream display, but it is
    // the only honest way to enforce the safety contract (SAFETY.md). UX
    // optimisations (server-side chunking of the filtered output) can
    // happen in a follow-up without changing the safety guarantee.
    const providerResponse = await chatWithFallback(augmentedMessages, model);

    const riskClass = safetyDecision?.kind === 'allow_llm'
      ? safetyDecision.riskClass
      : 'R0';

    const post = postCheck({
      response: providerResponse.content,
      riskClass,
      emergency: emergencyInfo,
    });

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
          choices: [{ delta: { content: post.filtered } }],
          provider: providerResponse.provider,
          model: providerResponse.model,
          riskClass,
          filtered: post.audit.modified,
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
