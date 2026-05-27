/**
 * Safety validator — the deterministic guardrail layer between the
 * AI-generated card stream and the UI renderer.
 *
 * Why this exists
 * ───────────────
 * MedOS is an AI-first clinical conversation engine: the model
 * generates the next question, the option list, the guidance bullets,
 * and the doctor summary every turn — see
 * `benchmarks/scripts/stages/format_sft.py` SYSTEM_PROMPT for the full
 * contract. Letting the model decide everything is a feature, not a
 * bug. But healthcare safety floors do not survive on goodwill: the
 * model can omit "None of these", forget to localise the emergency
 * number, or recommend a drug the patient is allergic to. Those
 * failure modes must be caught BEFORE the card reaches the user.
 *
 * What stays deterministic
 * ────────────────────────
 *   • JSON schema validity (Zod)
 *   • Required options on safety_check (rf:none, rf:unsure)
 *   • Option count caps (so the UI doesn't render a 20-item screen)
 *   • Locale-correct emergency_number
 *   • Required fields on every card kind (no half-filled guidance)
 *   • Source-chip enforcement on guidance (WHO/CDC/NHS)
 *   • Allergy-class cross-reaction guard (drops drug names that
 *     cross-react with declared allergies)
 *
 * What does NOT stay deterministic
 * ────────────────────────────────
 *   • The wording of any question, option label, why-clause, or
 *     guidance bullet — those are the model's job, per turn, for
 *     this patient. The validator does not own copy.
 *
 * Surface
 * ───────
 *   validateCard(card, ctx) → { ok: true, card } | { ok: false, ... }
 *
 * The renderer wires this in via CardRenderer.tsx — invalid cards
 * either get auto-repaired (e.g. missing rf:none appended) or fall
 * through to a neutral fallback bubble so the chat keeps flowing.
 */

import { z } from "zod";
import type { Card, Action } from "./types";

// ─────────────────────────────────────────────────────────────────────
// Zod schemas. One per card kind. The discriminated-union pattern
// matches the wire format and gives us per-kind error messages.
// ─────────────────────────────────────────────────────────────────────

const ActionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  style: z.enum(["primary", "secondary", "danger", "ghost"]).optional(),
  icon: z.string().optional(),
});

const GreetingSchema = z.object({
  kind: z.literal("greeting"),
  text: z.string().min(1),
  actions: z.array(ActionSchema).min(0).max(6),
});

const SafetyCheckSchema = z.object({
  kind: z.literal("safety_check"),
  title: z.string().min(1),
  question: z.string().min(1),
  options: z.array(ActionSchema).min(2).max(12),
  on_positive: z.enum(["emergency", "urgent_care", "continue"]),
});

const IntakeSchema = z.object({
  kind: z.literal("intake"),
  title: z.string().min(1),
  question: z.string().min(1),
  input_type: z.enum(["chips", "slider", "text"]),
  options: z.array(ActionSchema).max(12).optional(),
  slider: z
    .object({
      min: z.number(),
      max: z.number(),
      min_label: z.string().optional(),
      max_label: z.string().optional(),
    })
    .optional(),
  progress: z.number().min(0).max(1),
});

const GuidanceSchema = z.object({
  kind: z.literal("guidance"),
  title: z.string().min(1),
  care_level: z.enum(["self-care", "routine", "urgent", "emergency"]),
  why: z.string().min(1),
  what_now: z.array(z.string().min(1)).min(1),
  seek_care_if: z.array(z.string().min(1)).min(1),
  sources: z.array(z.string()).optional(),
});

const ProfileGateSchema = z.object({
  kind: z.literal("profile_gate"),
  title: z.string().min(1),
  reason: z.string().min(1),
  required_fields: z.array(z.string()).min(1),
  actions: z.array(ActionSchema).min(1).max(6),
});

const LimitedGuidanceSchema = z.object({
  kind: z.literal("limited_guidance"),
  general_advice: z.string().min(1),
  what_now: z.array(z.string()).min(1),
  missing_for_personalization: z.array(z.string()).min(1),
  actions: z.array(ActionSchema).min(1).max(6),
});

const EmergencySchema = z.object({
  kind: z.literal("emergency"),
  headline: z.string().min(1),
  reason: z.string().min(1),
  emergency_number: z.string().regex(/^[0-9+]{2,8}$/),
  actions: z.array(ActionSchema).min(1).max(6),
});

const NextStepsSchema = z.object({
  kind: z.literal("next_steps"),
  title: z.string().min(1),
  summary: z.string().optional(),
  actions: z.array(ActionSchema).min(1).max(6),
});

const DoctorSummarySchema = z.object({
  kind: z.literal("doctor_summary"),
  chief_complaint: z.string().min(1),
  duration: z.string().min(1),
  severity: z.number().min(0).max(10).optional(),
  red_flags_checked: z.array(z.string()),
  warning_signs_present: z.array(z.string()),
  current_guidance: z.string().min(1),
  seek_care_if: z.array(z.string()),
  generated_at: z.string().min(1),
});

const ContextSwitchSchema = z.object({
  kind: z.literal("context_switch"),
  previous_topic: z.string().min(1),
  new_topic: z.string().min(1),
  new_patient: z.boolean().optional(),
  response: z.string().min(1),
  suggested_action: ActionSchema,
});

const CardSchema = z.discriminatedUnion("kind", [
  GreetingSchema,
  SafetyCheckSchema,
  IntakeSchema,
  GuidanceSchema,
  ProfileGateSchema,
  LimitedGuidanceSchema,
  EmergencySchema,
  NextStepsSchema,
  DoctorSummarySchema,
  ContextSwitchSchema,
]);

// ─────────────────────────────────────────────────────────────────────
// Locale-correct emergency numbers. Mirrors the i18n table — duplicated
// here so the validator stays a pure function with no import chain
// into UI strings. If the table drifts, the unit tests will catch it.
// ─────────────────────────────────────────────────────────────────────

const EMERGENCY_NUMBERS: Record<string, string> = {
  US: "911",
  CA: "911",
  MX: "911",
  GB: "999",
  IE: "999",
  AU: "000",
  NZ: "111",
  JP: "119",
  // EU members default to 112
  IT: "112",
  DE: "112",
  FR: "112",
  ES: "112",
  PT: "112",
  NL: "112",
  PL: "112",
  AT: "112",
  BE: "112",
  CH: "112",
  // South Asia
  IN: "112",
  PK: "115",
  BD: "999",
  // East Asia
  CN: "120",
  KR: "119",
  TH: "1669",
  VN: "115",
  // MENA
  SA: "997",
  AE: "998",
  EG: "123",
  // Africa
  ZA: "10177",
  NG: "112",
  KE: "999",
  TZ: "112",
  // South America
  BR: "192",
  AR: "107",
  CO: "123",
};

const PAN_EU_FALLBACK = "112"; // 112 routes correctly across the entire EU

// ─────────────────────────────────────────────────────────────────────
// Allergy cross-reaction map. NOT a clinical reference — this is the
// minimum floor the application enforces regardless of model output.
// Add classes as the SFT corpus expands.
// ─────────────────────────────────────────────────────────────────────

const ALLERGY_BLOCKLIST: Record<string, RegExp[]> = {
  penicillin: [/\bamoxicillin\b/i, /\bampicillin\b/i, /\baugmentin\b/i, /\bpenicillin\b/i],
  nsaid: [/\bibuprofen\b/i, /\bnaproxen\b/i, /\baspirin\b/i, /\bdiclofenac\b/i, /\bketorolac\b/i],
  aspirin: [/\baspirin\b/i],
  sulfa: [/\bsulfamethoxazole\b/i, /\bsulfasalazine\b/i, /\bbactrim\b/i, /\bseptra\b/i],
  codeine: [/\bcodeine\b/i, /\btramadol\b/i],
};

// ─────────────────────────────────────────────────────────────────────
// Context object — what the validator needs to know about the session
// to enforce locale and patient-specific guardrails.
// ─────────────────────────────────────────────────────────────────────

export interface ValidatorContext {
  /** ISO country code (e.g. "US", "IT"). Used to enforce the correct
   *  emergency_number on emergency cards. */
  country?: string;
  /** Active patient allergies (lowercase). When present, the validator
   *  scrubs cross-reacting drug names from guidance.what_now and
   *  guidance.why. */
  allergies?: string[];
}

export type ValidationResult =
  | { ok: true; card: Card; repaired: string[] }
  | { ok: false; card: Card | null; errors: string[] };

// ─────────────────────────────────────────────────────────────────────
// Per-kind safety rules. Each rule either returns null (pass) or a
// pair { error?, repair? }. If repair is set, the rule mutates the
// card in-place and notes the repair so the caller can log it.
// ─────────────────────────────────────────────────────────────────────

type Rule = (
  card: any,
  ctx: ValidatorContext,
) => { error?: string; repair?: string } | null;

const REQUIRED_SAFETY_OPTIONS: Action[] = [
  { label: "None of these", value: "rf:none", style: "ghost" },
  { label: "Not sure", value: "rf:unsure", style: "ghost" },
];

const requireSafetyEscapeOptions: Rule = (card) => {
  if (card.kind !== "safety_check") return null;
  const values = new Set((card.options as Action[]).map((o) => o.value));
  const missing = REQUIRED_SAFETY_OPTIONS.filter((o) => !values.has(o.value));
  if (missing.length === 0) return null;
  card.options.push(...missing);
  return { repair: `appended ${missing.map((o) => o.value).join(", ")}` };
};

const enforceEmergencyLocale: Rule = (card, ctx) => {
  if (card.kind !== "emergency") return null;
  const expected =
    (ctx.country && EMERGENCY_NUMBERS[ctx.country.toUpperCase()]) ||
    PAN_EU_FALLBACK;
  if (card.emergency_number === expected) return null;
  const wrong = card.emergency_number;
  card.emergency_number = expected;
  // Also rewrite any "Call <wrong>" labels in the action list.
  for (const a of card.actions || []) {
    if (typeof a.label === "string") {
      a.label = a.label.replace(wrong, expected);
    }
    if (typeof a.value === "string" && a.value.startsWith("tel:")) {
      a.value = `tel:${expected}`;
    }
  }
  return { repair: `emergency_number ${wrong} → ${expected} for ${ctx.country}` };
};

const scrubAllergens: Rule = (card, ctx) => {
  if (!ctx.allergies || ctx.allergies.length === 0) return null;
  if (card.kind !== "guidance" && card.kind !== "limited_guidance") return null;
  const patterns: RegExp[] = [];
  for (const a of ctx.allergies) {
    const list = ALLERGY_BLOCKLIST[a.toLowerCase()];
    if (list) patterns.push(...list);
  }
  if (patterns.length === 0) return null;
  let hits = 0;
  const scrub = (s: string): string => {
    let out = s;
    for (const p of patterns) {
      if (p.test(out)) {
        hits++;
        out = out.replace(
          p,
          "[removed: cross-reacts with declared allergy]",
        );
      }
    }
    return out;
  };
  if (card.kind === "guidance") {
    card.why = scrub(card.why);
    card.what_now = (card.what_now as string[]).map(scrub);
  } else {
    card.general_advice = scrub(card.general_advice);
    card.what_now = (card.what_now as string[]).map(scrub);
  }
  if (hits === 0) return null;
  return { repair: `scrubbed ${hits} drug reference(s) cross-reacting with ${ctx.allergies.join(", ")}` };
};

const requireGuidanceSources: Rule = (card) => {
  if (card.kind !== "guidance") return null;
  const has = Array.isArray(card.sources) && card.sources.length > 0;
  if (has) return null;
  card.sources = ["WHO", "CDC", "NHS"];
  return { repair: "appended default sources (WHO · CDC · NHS)" };
};

const enforceIntakeShape: Rule = (card) => {
  if (card.kind !== "intake") return null;
  if (card.input_type === "chips" && (!card.options || card.options.length === 0)) {
    return { error: "intake.input_type=chips but options is empty" };
  }
  if (card.input_type === "slider" && !card.slider) {
    return { error: "intake.input_type=slider but slider is missing" };
  }
  return null;
};

const enforceDoctorSummaryGenerated: Rule = (card) => {
  if (card.kind !== "doctor_summary") return null;
  if (!card.generated_at || isNaN(Date.parse(card.generated_at))) {
    card.generated_at = new Date().toISOString();
    return { repair: "filled missing generated_at with now()" };
  }
  return null;
};

const RULES: Rule[] = [
  requireSafetyEscapeOptions,
  enforceEmergencyLocale,
  scrubAllergens,
  requireGuidanceSources,
  enforceIntakeShape,
  enforceDoctorSummaryGenerated,
];

// ─────────────────────────────────────────────────────────────────────
// Public surface
// ─────────────────────────────────────────────────────────────────────

/**
 * Validate (and lightly repair) a single AI-emitted card before
 * rendering. Returns `{ok: true, card}` for any card that either
 * passes schema + safety rules or could be repaired by appending
 * missing required options / fixing the emergency number / scrubbing
 * allergens. Returns `{ok: false, errors}` for cards that cannot be
 * safely rendered (e.g. intake with input_type=slider but no slider
 * block) — the caller is expected to drop those.
 *
 * Mutates the input card in place when applying repairs.
 */
export function validateCard(
  card: unknown,
  ctx: ValidatorContext = {},
): ValidationResult {
  // 1. Schema check via Zod. We use safeParse so the validator never
  //    throws — broken cards become structured errors the caller can
  //    log and drop.
  const parsed = CardSchema.safeParse(card);
  if (!parsed.success) {
    return {
      ok: false,
      card: null,
      errors: parsed.error.errors.map(
        (e) => `${e.path.join(".") || "<root>"}: ${e.message}`,
      ),
    };
  }
  const safe = parsed.data as any; // narrowed, but we still apply rules

  // 2. Per-kind safety rules. Each rule can repair the card or surface
  //    a fatal error.
  const repaired: string[] = [];
  const errors: string[] = [];
  for (const rule of RULES) {
    const r = rule(safe, ctx);
    if (!r) continue;
    if (r.error) errors.push(r.error);
    if (r.repair) repaired.push(r.repair);
  }
  if (errors.length > 0) {
    return { ok: false, card: safe as Card, errors };
  }
  return { ok: true, card: safe as Card, repaired };
}

/** Convenience wrapper used by the renderer. Logs repairs at debug
 *  level (so a forward-rolling model that emits unsafe options shows
 *  up in dev tools) and drops fatally-invalid cards. */
export function validateOrDrop(
  card: unknown,
  ctx: ValidatorContext = {},
): Card | null {
  const result = validateCard(card, ctx);
  if (!result.ok) {
    if (typeof console !== "undefined") {
      console.warn(
        "[MedicalFlow] dropped invalid card:",
        result.errors.join("; "),
        card,
      );
    }
    return null;
  }
  if (result.repaired.length > 0 && typeof console !== "undefined") {
    console.debug(
      "[MedicalFlow] repaired card:",
      result.repaired.join("; "),
    );
  }
  return result.card;
}
