/**
 * Action router — the deterministic dispatcher that decides whether an
 * incoming request needs to call the LLM at all.
 *
 * Card-button clicks are typed events (`MedActionEvent`). The
 * SYSTEM_PROMPT teaches the model to recognise them, but a typed
 * action like `doctor_summary` is exactly the wrong moment to risk
 * "the model decided to re-classify this as a chest-pain symptom
 * mention" — so the router short-circuits those before any LLM call.
 *
 * Three dispatch outcomes:
 *
 *   handled:
 *     - The router built the response itself (e.g. doctor_summary
 *       card from derived state). The route streams it back as a
 *       single SSE delta and skips the LLM entirely.
 *   forward:
 *     - Either a free-text message or an action the LLM should still
 *       handle (e.g. `select` chip → the model emits the next intake
 *       card). The route forwards to OllaBridge.
 *   reject:
 *     - The action is malformed or refers to a flow that hasn't been
 *       opened yet (e.g. doctor_summary on an empty conversation).
 *       The route returns a graceful "nothing yet to summarise" SSE
 *       frame.
 */

import { buildDoctorSummary, serializeDoctorSummaryCard } from "./doctor-summary-builder";
import type { DerivedState } from "./conversation-state";

export type ActionType =
  | "doctor_summary"
  | "find_nearby_care"
  | "add_health_profile"
  | "ask_another_question"
  | "start_new_chat"
  | "switch_topic"
  | "stay_on_topic"
  | "select"
  | "emergency";

export interface ActionEvent {
  type: ActionType;
  /** Present on `select` actions — the chip's machine-readable value. */
  value?: string;
  /** Present on `select` actions — the chip's display label. */
  label?: string;
}

export type RouterDecision =
  | { kind: "handled"; sse: string }
  | { kind: "forward" }
  | { kind: "reject"; reason: string; sse: string };

/**
 * Decide what to do with the incoming request.
 *
 * Inputs:
 *   action — the typed event, or undefined for a normal user message
 *   state  — derived from the message history this turn
 *
 * The function is pure: it never touches the LLM and never mutates
 * state. The route is the only side-effecting layer.
 */
export function route(
  action: ActionEvent | undefined,
  state: DerivedState,
): RouterDecision {
  if (!action) return { kind: "forward" };

  switch (action.type) {
    case "doctor_summary": {
      if (!state.has_started_flow) {
        // Nothing to summarise — return a polite message rather than
        // a half-empty doctor_summary card that would look broken.
        return {
          kind: "reject",
          reason: "no flow started yet",
          sse: encodeAsAssistantText(
            "There's nothing to summarise yet. Tell me what's bothering you first and I'll build the summary from your answers.",
          ),
        };
      }
      const card = buildDoctorSummary(state);
      return {
        kind: "handled",
        sse: encodeAsAssistantText(serializeDoctorSummaryCard(card)),
      };
    }

    case "find_nearby_care":
    case "add_health_profile":
    case "ask_another_question":
    case "start_new_chat":
      // These are pure navigation actions on the client. They should
      // never reach the server in the first place (MedOSApp.onCardAction
      // handles them locally), but if a future caller does send them,
      // return an empty acknowledgement so we never burn an LLM call
      // on a no-op.
      return {
        kind: "handled",
        sse: "",
      };

    case "switch_topic":
    case "stay_on_topic":
      // These come back from a context_switch card. They DO need the
      // LLM to produce the next clinical step (either the new topic's
      // safety_check or a confirmation that we're staying), so forward
      // — the model has the tag inline thanks to serializeActionTag.
      return { kind: "forward" };

    case "select":
      // Chip / slider selections — the LLM decides what to ask next
      // based on the structured answer. Forward.
      return { kind: "forward" };

    case "emergency":
      // The emergency card's primary action is `tel:` — handled in the
      // browser. If it somehow reaches us, route to the static
      // emergency template via the LLM.
      return { kind: "forward" };

    default:
      // Unknown action — be permissive and forward so a forward-rolling
      // backend can add types without breaking older clients.
      return { kind: "forward" };
  }
}

/**
 * Wrap a string as a single OpenAI-style SSE `data:` frame followed by
 * `data: [DONE]`. The orchestrator route writes this directly to the
 * Response stream for the `handled` and `reject` outcomes. The frame
 * shape matches what `useChat.ts` expects (`choices[0].delta.content`),
 * so the client doesn't need any branching to handle synthetic frames.
 */
function encodeAsAssistantText(text: string): string {
  const payload = {
    id: `chatcmpl-medos-${Date.now().toString(36)}`,
    object: "chat.completion.chunk",
    choices: [
      {
        index: 0,
        delta: { content: text },
        finish_reason: null,
      },
    ],
    provider: "medos-orchestrator",
    model: "medos-deterministic",
  };
  return `data: ${JSON.stringify(payload)}\n\n` + `data: [DONE]\n\n`;
}
