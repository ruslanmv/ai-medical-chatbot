import OpenAI from 'openai';
import type { ChatMessage, ProviderResponse } from './index';
import { loadConfig } from '@/lib/server-config';

const MEDICAL_SYSTEM_PROMPT = `You are MedOS, a knowledgeable and empathetic AI medical assistant. Your role is to provide helpful, accurate general health information while being clear about your limitations.

IMPORTANT GUIDELINES:
- Always clarify that you provide general health information, NOT medical diagnoses
- Encourage users to consult healthcare professionals for specific medical concerns
- Be empathetic and supportive in your responses
- If the user describes emergency symptoms (chest pain, difficulty breathing, severe bleeding, suicidal thoughts), IMMEDIATELY advise them to call their local emergency number
- Respond in the same language the user writes in
- Use clear, simple language accessible to people of all health literacy levels
- When discussing medications, always recommend consulting a pharmacist or doctor
- Never prescribe medications or provide dosage instructions
- Cite general medical knowledge without making definitive claims
- Be culturally sensitive in your responses`;

function getClient(): OpenAI {
  // Prefer admin-configured values (from /api/admin/config PUT) so updates
  // in the Admin UI take effect without a redeploy. Fall back to env vars.
  let configUrl = '';
  let configKey = '';
  try {
    const cfg = loadConfig();
    configUrl = cfg.llm.ollabridgeUrl;
    configKey = cfg.llm.ollabridgeApiKey;
  } catch {
    // If the config file can't be read (e.g. cold start before /data mount),
    // silently fall through to env vars.
  }

  const baseURL =
    configUrl ||
    process.env.OLLABRIDGE_URL ||
    'https://ruslanmv-ollabridge.hf.space';
  const apiKey = configKey || process.env.OLLABRIDGE_API_KEY || 'not-required';

  return new OpenAI({
    baseURL: `${baseURL.replace(/\/+$/, '')}/v1`,
    apiKey,
    timeout: 30000,
    maxRetries: 2,
  });
}

export async function streamWithOllaBridge(
  messages: ChatMessage[],
  model: string = 'qwen2.5:1.5b'
): Promise<ReadableStream> {
  const client = getClient();

  const allMessages: ChatMessage[] = [
    { role: 'system', content: MEDICAL_SYSTEM_PROMPT },
    ...messages,
  ];

  const stream = await client.chat.completions.create({
    model,
    messages: allMessages,
    stream: true,
    max_tokens: 1000,
    temperature: 0.7,
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            const data = JSON.stringify({
              choices: [{ delta: { content } }],
              provider: 'ollabridge',
              model: chunk.model || model,
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
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

export async function chatWithOllaBridge(
  messages: ChatMessage[],
  model: string = 'qwen2.5:1.5b'
): Promise<ProviderResponse> {
  const client = getClient();

  const allMessages: ChatMessage[] = [
    { role: 'system', content: MEDICAL_SYSTEM_PROMPT },
    ...messages,
  ];

  const response = await client.chat.completions.create({
    model,
    messages: allMessages,
    max_tokens: 1000,
    temperature: 0.7,
  });

  return {
    content: response.choices[0]?.message?.content || '',
    provider: 'ollabridge',
    model: response.model || model,
  };
}
