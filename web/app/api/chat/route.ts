/**
 * /api/chat — MedOS orchestrator entry point.
 *
 * Replaces the previous `/api/proxy/chat` straight-passthrough to the
 * HF Space. This route owns the AI-first product logic that the proxy
 * can't:
 *
 *   1. Reads the typed `action` event from the request body.
 *   2. Derives conversation state from the message history.
 *   3. Runs the action router — actions like `doctor_summary` are
 *      handled deterministically here (built from derived state) and
 *      never reach the LLM.
 *   4. For everything else, stamps an AI-first system prompt + flow
 *      hint and forwards to OllaBridge Cloud's OpenAI-compatible
 *      `/v1/chat/completions` endpoint, streaming the result through.
 *
 * What stays out of this file:
 *   - Medical copy (lives in the model + the system prompt).
 *   - Schema validation of emitted cards (the client-side safety
 *     validator handles it before render).
 *   - UI concerns.
 *
 * What deliberately stays in:
 *   - Action routing — the only place we can guarantee a click never
 *     loops back into the wrong intake.
 *   - Doctor-summary generation — built from real conversation slots
 *     so the output isn't a memorized template.
 *   - System-prompt construction — the contract between the orchestrator
 *     and any LLM is centralised here, regardless of which OllaBridge
 *     model alias is configured.
 */

import { NextRequest, NextResponse } from "next/server";

import {
  deriveConversationState,
  type WireMessage,
} from "@/lib/medos-orchestrator/conversation-state";
import { route, type ActionEvent } from "@/lib/medos-orchestrator/action-router";
import { buildSystemMessage } from "@/lib/medos-orchestrator/prompt-builder";
import { classifyContextSwitch } from "@/lib/medos-orchestrator/context-switch-classifier";
import {
  OllaBridgeNotConfigured,
  streamChatCompletion,
} from "@/lib/medos-orchestrator/ollabridge-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatRequestBody {
  messages: WireMessage[];
  action?: ActionEvent;
  flow?: { active_topic?: string | null };
  context?: {
    country?: string;
    language?: string;
    emergencyNumber?: string;
  };
  model?: string;
}

export async function POST(req: NextRequest): Promise<Response> {
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json(
      { error: "`messages` is required and must be non-empty" },
      { status: 400 },
    );
  }

  // ── 1. Derive state from the conversation we received. ──────────────
  const state = deriveConversationState(body.messages);

  // ── 2. Run the action router. Deterministic outcomes (doctor_summary,
  //       pure-nav rejects) get streamed back from here without touching
  //       the LLM. ────────────────────────────────────────────────────
  const decision = route(body.action, state);
  if (decision.kind === "handled" || decision.kind === "reject") {
    return sseFromString(decision.sse || endOfStream());
  }

  // ── 3. Build the system prompt (AI-first contract + flow hint) and
  //       prepend it. Drop any pre-existing system messages — this route
  //       is the single source of truth for the inference contract. ──
  const country = body.context?.country;
  const language = body.context?.language;
  const switchHint = classifyContextSwitch(
    body.messages[body.messages.length - 1]?.content ?? "",
    state,
  );

  const system = buildSystemMessage({
    country,
    language,
    active_topic: state.active_topic,
    patient_subject: state.patient_subject,
  });

  // Append the context-switch hint as a lightweight `<flow_hint>`
  // continuation. The model is free to ignore it; the hint just makes
  // the right answer cheaper to reach when the inference model isn't
  // yet fine-tuned for the new SYSTEM_PROMPT.
  const enrichedSystem: WireMessage = {
    role: "system",
    content:
      system.content +
      "\n\n<flow_hint>\n" +
      `context_switch_likelihood=${switchHint.likelihood.toFixed(2)}\n` +
      `context_switch_reason=${switchHint.reason}\n` +
      (switchHint.new_patient_likely
        ? "context_switch_new_patient=true\n"
        : "") +
      "</flow_hint>",
  };

  const forwardMessages: WireMessage[] = [
    enrichedSystem,
    ...body.messages.filter((m) => m.role !== "system"),
  ];

  // ── 4. Forward to OllaBridge and pipe the SSE stream through. ──────
  try {
    const upstream = await streamChatCompletion({
      messages: forwardMessages,
      model: body.model,
      signal: req.signal,
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => "");
      console.error(
        `[Orchestrator] OllaBridge ${upstream.status}: ${text.slice(0, 200)}`,
      );
      return NextResponse.json(
        {
          error:
            "The LLM gateway returned an error. Try again in a moment.",
          code: "ollabridge_upstream_error",
          upstreamStatus: upstream.status,
        },
        { status: upstream.status >= 500 ? 502 : upstream.status },
      );
    }

    // Pass-through streaming. The client already speaks the OpenAI
    // SSE shape (`useChat.ts` parses `choices[0].delta.content`), so
    // we don't have to transform.
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    if (err instanceof OllaBridgeNotConfigured) {
      return NextResponse.json(
        {
          error:
            "OllaBridge is not configured. Set OLLABRIDGE_BASE_URL and OLLABRIDGE_API_KEY on the server.",
          code: "ollabridge_not_configured",
        },
        { status: 503 },
      );
    }
    const aborted = (err as any)?.name === "AbortError";
    console.error("[Orchestrator] upstream failed:", err);
    return NextResponse.json(
      {
        error: aborted
          ? "The LLM took too long to respond. Please try again."
          : "Could not reach the LLM gateway. Please try again.",
        code: aborted ? "ollabridge_timeout" : "ollabridge_unreachable",
      },
      { status: aborted ? 504 : 502 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

/** Wrap an already-formed SSE payload string in a streaming Response.
 *  Used for the action-router's deterministic outcomes (doctor_summary,
 *  rejects). */
function sseFromString(sse: string): Response {
  const body = sse.length > 0 ? sse : endOfStream();
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    },
  });
}

function endOfStream(): string {
  return "data: [DONE]\n\n";
}
