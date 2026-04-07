import type { ChatMessage, ProviderResponse } from './index';

/**
 * HuggingFace Inference Providers router — OpenAI-compatible endpoint.
 *
 * Uses router.huggingface.co with a deep fallback chain of verified
 * working models (tested 2026-04-07). Provider pinning via :suffix
 * syntax routes to specific backends (sambanova, together, etc.).
 */
const HF_BASE_URL = 'https://router.huggingface.co/v1';

/** Ordered fallback chain — all verified working on free tier. */
const MODEL_CHAIN = [
  'meta-llama/Llama-3.3-70B-Instruct:sambanova',
  'meta-llama/Llama-3.3-70B-Instruct:together',
  'meta-llama/Llama-3.3-70B-Instruct',       // auto-route
  'Qwen/Qwen2.5-72B-Instruct',
  'Qwen/Qwen3-235B-A22B',
  'google/gemma-3-27b-it',
  'meta-llama/Llama-3.1-70B-Instruct',
  'Qwen/Qwen3-32B',
  'deepseek-ai/DeepSeek-V3-0324',
];

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

  // Try each model in the chain until one succeeds.
  let response: Response | null = null;
  let activeModel = MODEL_CHAIN[0];
  for (const model of MODEL_CHAIN) {
    const res = await callHF(messages, model, true);
    if (res.ok) {
      response = res;
      activeModel = model;
      break;
    }
    console.log(`[HF] ${model} returned ${res.status}, trying next...`);
  }
  if (!response || !response.ok) {
    throw new Error('All HF Inference models unavailable');
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
  let response: Response | null = null;
  let activeModel = MODEL_CHAIN[0];
  for (const model of MODEL_CHAIN) {
    const res = await callHF(messages, model, false);
    if (res.ok) {
      response = res;
      activeModel = model;
      break;
    }
    console.log(`[HF] ${model} returned ${res.status}, trying next...`);
  }
  if (!response || !response.ok) {
    throw new Error('All HF Inference models unavailable');
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    provider: 'huggingface',
    model: activeModel,
  };
}
