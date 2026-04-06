import { NextRequest } from 'next/server';
import { z } from 'zod';
import { streamWithFallback, type ChatMessage } from '@/lib/providers';
import { triageMessage } from '@/lib/safety/triage';
import { getEmergencyInfo } from '@/lib/safety/emergency-numbers';
import { buildRAGContext } from '@/lib/rag/medical-kb';
import { buildMedicalSystemPrompt } from '@/lib/medical-knowledge';

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
  try {
    const body = await request.json();
    const { messages, model, language, countryCode } = RequestSchema.parse(body);

    // Step 1: Emergency triage on the latest user message
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
    if (lastUserMessage) {
      const triage = triageMessage(lastUserMessage.content);

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
    const ragContext = lastUserMessage
      ? buildRAGContext(lastUserMessage.content)
      : '';

    // Step 3: Build a structured, locale-aware system prompt that grounds
    // the model in WHO/CDC/NHS guidance and pins the response language,
    // country, emergency number, and measurement system. This replaces
    // the old inline "respond in X language" instruction.
    const emergencyInfo = getEmergencyInfo(countryCode);
    const systemPrompt = buildMedicalSystemPrompt({
      country: countryCode,
      language,
      emergencyNumber: emergencyInfo.emergency,
    });

    // Step 4: Assemble the final message list: system prompt first, then
    // the conversation history, with the last user turn augmented by the
    // retrieved RAG context (kept inline so the model treats it as recent
    // reference material rather than a background instruction).
    const priorMessages = messages.slice(0, -1);
    const finalUserContent = [
      lastUserMessage?.content || '',
      ragContext
        ? `\n\n[Reference material retrieved from the medical knowledge base — use if relevant]\n${ragContext}`
        : '',
    ].join('');

    const augmentedMessages: ChatMessage[] = [
      { role: 'system' as const, content: systemPrompt },
      ...priorMessages,
      { role: 'user' as const, content: finalUserContent },
    ];

    // Step 4: Stream response from OllaBridge-Cloud (with fallback chain)
    const stream = await streamWithFallback(augmentedMessages, model);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[Chat API Error]:', error);

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
