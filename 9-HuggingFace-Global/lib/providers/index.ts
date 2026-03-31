import { streamWithOllaBridge, chatWithOllaBridge } from './ollabridge';
import {
  streamWithHuggingFace,
  chatWithHuggingFace,
} from './huggingface-direct';
import { getCachedFAQResponse } from './cached-faq';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ProviderResponse {
  content: string;
  provider: string;
  model: string;
}

/**
 * Stream chat completion with automatic fallback chain:
 * 1. OllaBridge-Cloud (smart multi-provider routing)
 * 2. Direct HuggingFace Inference API
 * 3. Cached FAQ response (always works, even offline)
 */
export async function streamWithFallback(
  messages: ChatMessage[],
  model: string = 'qwen2.5:1.5b'
): Promise<ReadableStream> {
  // Try OllaBridge-Cloud first (routes to best free provider)
  try {
    return await streamWithOllaBridge(messages, model);
  } catch (error) {
    console.warn('[Provider] OllaBridge unavailable, falling back to HF:', error);
  }

  // Fallback: Direct HuggingFace Inference API
  try {
    return await streamWithHuggingFace(messages);
  } catch (error) {
    console.warn('[Provider] HF unavailable, falling back to cached FAQ:', error);
  }

  // Ultimate fallback: Cached FAQ (always works)
  const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
  const faqResponse = getCachedFAQResponse(lastUserMessage?.content || '');

  return new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: faqResponse } }] })}\n\n`));
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
}

/**
 * Non-streaming chat completion with fallback chain.
 */
export async function chatWithFallback(
  messages: ChatMessage[],
  model: string = 'qwen2.5:1.5b'
): Promise<ProviderResponse> {
  try {
    return await chatWithOllaBridge(messages, model);
  } catch {
    // silent fallback
  }

  try {
    return await chatWithHuggingFace(messages);
  } catch {
    // silent fallback
  }

  const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
  return {
    content: getCachedFAQResponse(lastUserMessage?.content || ''),
    provider: 'cached-faq',
    model: 'offline',
  };
}
