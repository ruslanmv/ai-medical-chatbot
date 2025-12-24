import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyConnection } from "@/lib/providers";
import type { Provider } from "@/lib/types";

export const runtime = "nodejs";

const BodySchema = z.object({
  provider: z.enum(["openai", "gemini", "claude", "watsonx", "ollama"]),
  apiKey: z.string().min(1, "API key is required"),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = BodySchema.parse(json);

    const result = await verifyConnection({
      provider: body.provider as Provider,
      apiKey: body.apiKey,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Connection verified successfully",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Connection failed",
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Verify API error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
