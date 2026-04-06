import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyConnection } from "@/lib/providers";

export const runtime = "nodejs";

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

const BodySchema = z
  .object({
    preset: PresetEnum.optional(),
    provider: ProviderEnum.optional(),
    model: z.string().optional(),
    apiKey: z.string().optional(),
    userHfToken: z.string().optional(),
  })
  .refine((v) => v.preset || v.provider, {
    message: "Either `preset` or `provider` must be provided",
  });

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = BodySchema.parse(json);

    const result = await verifyConnection({
      preset: body.preset,
      provider: body.provider,
      model: body.model,
      apiKey: body.apiKey,
      userHfToken: body.userHfToken,
      messages: [{ role: "user", content: "Hi" }],
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Connection verified: ${result.label ?? "ok"}`,
      });
    }
    return NextResponse.json(
      { success: false, error: result.error || "Connection failed" },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("Verify API error:", error?.message);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
