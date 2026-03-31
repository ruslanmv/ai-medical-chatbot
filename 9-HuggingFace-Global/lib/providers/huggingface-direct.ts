import type { ChatMessage, ProviderResponse } from './index';

const DEFAULT_MODEL = 'mistralai/Mixtral-8x7B-Instruct-v0.1';
const HF_BASE_URL = 'https://router.huggingface.co/hf-inference';

/**
 * Direct HuggingFace Inference API fallback.
 * Uses router.huggingface.co (new endpoint replacing api-inference.huggingface.co).
 */
export async function streamWithHuggingFace(
  messages: ChatMessage[]
): Promise<ReadableStream> {
  const token = process.env.HF_TOKEN || '';
  const encoder = new TextEncoder();

  const response = await fetch(`${HF_BASE_URL}/models/${DEFAULT_MODEL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: 1000,
      temperature: 0.7,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`HF Inference API error: ${response.status}`);
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
                    model: DEFAULT_MODEL,
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
  messages: ChatMessage[]
): Promise<ProviderResponse> {
  const token = process.env.HF_TOKEN || '';

  const response = await fetch(`${HF_BASE_URL}/models/${DEFAULT_MODEL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`HF Inference API error: ${response.status}`);
  }

  const data = await response.json();

  return {
    content: data.choices?.[0]?.message?.content || '',
    provider: 'huggingface',
    model: DEFAULT_MODEL,
  };
}
