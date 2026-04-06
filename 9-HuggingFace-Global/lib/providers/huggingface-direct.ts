import type { ChatMessage, ProviderResponse } from './index';

/**
 * HuggingFace Inference Providers router — OpenAI-compatible endpoint.
 *
 * Defaults to Llama 3.3 70B Instruct pinned to Groq, which gives the best
 * quality-to-latency ratio on the HF free tier (sub-second TTFT, strong
 * medical reasoning). The `:groq` suffix is HF's documented syntax for
 * pinning a specific inference provider; strip it to let the router
 * auto-select. On 429/5xx we transparently fall through to Mixtral via
 * HF-default routing (handled by the caller's fallback chain).
 */
const DEFAULT_MODEL = 'meta-llama/Llama-3.3-70B-Instruct:groq';
const FALLBACK_MODEL = 'meta-llama/Llama-3.3-70B-Instruct';
const HF_BASE_URL = 'https://router.huggingface.co/v1';

async function callHF(
  messages: ChatMessage[],
  model: string,
  stream: boolean,
): Promise<Response> {
  const token = process.env.HF_TOKEN || '';
  return fetch(`${HF_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: 1000,
      temperature: 0.7,
      stream,
    }),
  });
}

export async function streamWithHuggingFace(
  messages: ChatMessage[],
): Promise<ReadableStream> {
  const encoder = new TextEncoder();

  // Try the preferred provider-pinned model first, then the auto-routed one.
  let response = await callHF(messages, DEFAULT_MODEL, true);
  let activeModel = DEFAULT_MODEL;
  if (!response.ok) {
    response = await callHF(messages, FALLBACK_MODEL, true);
    activeModel = FALLBACK_MODEL;
  }
  if (!response.ok) {
    throw new Error(`HF Inference Providers error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  return new ReadableStream({
    async start(controller) {
      try {
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const parsed = JSON.parse(line.slice(6));
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  const data = JSON.stringify({
                    choices: [{ delta: { content } }],
                    provider: 'huggingface',
                    model: activeModel,
                  });
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

export async function chatWithHuggingFace(
  messages: ChatMessage[],
): Promise<ProviderResponse> {
  let response = await callHF(messages, DEFAULT_MODEL, false);
  let activeModel = DEFAULT_MODEL;
  if (!response.ok) {
    response = await callHF(messages, FALLBACK_MODEL, false);
    activeModel = FALLBACK_MODEL;
  }
  if (!response.ok) {
    throw new Error(`HF Inference Providers error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    provider: 'huggingface',
    model: activeModel,
  };
}
