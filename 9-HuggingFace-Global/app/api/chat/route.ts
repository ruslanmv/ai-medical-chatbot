import { NextRequest } from 'next/server';
import { z } from 'zod';
import { streamWithFallback, type ChatMessage } from '@/lib/providers';
import { triageMessage } from '@/lib/safety/triage';
import { getEmergencyInfo } from '@/lib/safety/emergency-numbers';
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

    if (lastUserMessage) {
      const triage = triageMessage(cleanUserContent);
      console.log(
        `[Chat] route.triage ${JSON.stringify({
          userId: user?.id || null,
          isEmergency: triage.isEmergency,
          userChars: cleanUserContent.length,
        })}`,
      );

      if (triage.isEmergency) {
        const emergencyInfo = getEmergencyInfo(countryCode);
        const emergencyResponse = [
          `**EMERGENCY DETECTED**\n\n`,
          `${triage.guidance}\n\n`,
          `**Call emergency services NOW:**\n`,
          `- Emergency: **${emergencyInfo.emergency}** (${emergencyInfo.country})\n`,
          `- Ambulance: **${emergencyInfo.ambulance}**\n`,
          emergencyInfo.crisisHotline
            ? `- Crisis Hotline: **${emergencyInfo.crisisHotline}**\n`
            : '',
          `\nDo not delay. Every minute matters.`,
        ].join('');

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            const data = JSON.stringify({
              choices: [{ delta: { content: emergencyResponse } }],
              provider: 'triage',
              model: 'emergency-detection',
              isEmergency: true,
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
            meta: { triage: 'emergency', countryCode, model: 'emergency-detection' },
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
    // country, emergency number, and measurement system.
    const emergencyInfo = getEmergencyInfo(countryCode);
    const systemPrompt = buildMedicalSystemPrompt({
      country: countryCode,
      language,
      emergencyNumber: emergencyInfo.emergency,
    });

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
    const stream = await streamWithFallback(augmentedMessages, model);
    console.log(
      `[Chat] route.stream.opened ${JSON.stringify({
        userId: user?.id || null,
        totalMs: Date.now() - routeStartedAt,
      })}`,
    );

    if (user) {
      auditLog({
        userId: user.id,
        action: 'chat',
        ip,
        meta: {
          model,
          countryCode,
          turns: messages.length,
          patientContextChars: patientContext.length,
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

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
