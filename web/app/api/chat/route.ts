import { NextResponse } from "next/server";
import { z } from "zod";
import { streamWithProvider } from "@/lib/providers";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ProviderEnum = z.enum([
  "hf",
  "ollabridge",
  "ollama",
  "openai",
  "gemini",
  "claude",
]);

const PresetEnum = z.enum([
  "free-best",
  "free-fastest",
  "free-flexible",
  "deep-reasoning",
  "local",
  "ollabridge",
]);

const ContextSchema = z
  .object({
    country: z.string().min(2).max(3),
    language: z.string().min(2).max(5),
    emergencyNumber: z.string().min(2).max(10),
    units: z.enum(["metric", "imperial"]).optional(),
  })
  .optional();

const BodySchema = z
  .object({
    preset: PresetEnum.optional(),
    provider: ProviderEnum.optional(),
    model: z.string().optional(),
    apiKey: z.string().optional(),
    userHfToken: z.string().optional(),
    context: ContextSchema,
    messages: z
      .array(
        z.object({
          role: z.enum(["user", "assistant", "system"]),
          content: z.string().min(1),
        }),
      )
      .min(1, "At least one message is required"),
  })
  .refine((v) => v.preset || v.provider, {
    message: "Either `preset` or `provider` must be provided",
  });

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = BodySchema.parse(json);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamWithProvider({
            preset: body.preset,
            provider: body.provider,
            model: body.model,
            apiKey: body.apiKey,
            userHfToken: body.userHfToken,
            context: body.context,
            messages: body.messages as ChatMessage[],
          })) {
            const data = `data: ${JSON.stringify({ content: chunk })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error: any) {
          const errorMessage =
            error?.message || "An error occurred during streaming";
          // Redact obvious secrets before sending to client
          const redacted = errorMessage
            .replace(/hf_[A-Za-z0-9]{10,}/g, "hf_***")
            .replace(/sk-[A-Za-z0-9_-]{10,}/g, "sk-***");
          const errorData = `data: ${JSON.stringify({ error: redacted })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Chat API error:", error?.message);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
