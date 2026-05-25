"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { X, Stethoscope, CheckCircle2 } from "lucide-react";
import { MessageBubble } from "../chat/MessageBubble";
import { HeroInput } from "../chat/HeroInput";
import { TypingIndicator } from "../chat/TypingIndicator";
import { TrustBar } from "../chat/TrustBar";
import type { ChatMessage } from "@/lib/hooks/useChat";
import type { EHRProfile } from "@/lib/health-store";
import { t, type SupportedLanguage } from "@/lib/i18n";

interface ChatViewProps {
  messages: ChatMessage[];
  isTyping: boolean;
  onSendMessage: (content: string) => void;
  language?: SupportedLanguage;
  emergencyNumber?: string;
  voiceEnabled?: boolean;
  readAloud?: boolean;
  onNavigateEmergency?: () => void;
  /** Set by the parent right after the user finishes the EHR wizard with
   *  "Save & continue chat". Renders a one-time dismissible card that names
   *  what the AI now knows about the patient — the explicit payoff signal
   *  that closes the wizard → chat loop. */
  profileWelcome?: boolean;
  onDismissProfileWelcome?: () => void;
  /** Used to summarise the saved profile in the welcome card. */
  ehrProfile?: EHRProfile;
  activeMedicationsCount?: number;
}

export function ChatView({
  messages,
  isTyping,
  onSendMessage,
  language = "en",
  emergencyNumber = "911",
  voiceEnabled = true,
  readAloud = false,
  onNavigateEmergency,
  profileWelcome = false,
  onDismissProfileWelcome,
  ehrProfile,
  activeMedicationsCount = 0,
}: ChatViewProps) {
  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // The persistent top-of-thread "This may be an emergency / Call 112"
  // banner was removed. It was authored client-side from a fixed i18n
  // template and fired as soon as the user typed an emergency keyword,
  // which made the reply feel hardcoded (a wall of red instructions
  // shown BEFORE the model had a chance to answer). The safety floor
  // is still enforced server-side: when preCheck() classifies the
  // turn as R5 the chat route weaves the emergency-template text into
  // the bot's reply itself, so the user always sees the call-emergency
  // guidance — just delivered conversationally as part of the bot's
  // message, not pinned above it.

  // Read aloud the latest AI message.
  useEffect(() => {
    if (!readAloud || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (
      last.role === "ai" &&
      !isTyping &&
      typeof speechSynthesis !== "undefined"
    ) {
      const u = new SpeechSynthesisUtterance(last.content);
      u.lang = language;
      speechSynthesis.speak(u);
    }
  }, [messages, isTyping, readAloud, language]);

  const startVoice = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onSendMessage(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  // True once the user has actually started a conversation. The thread
  // now begins empty (the canned "Hello! I'm your medical AI assistant…"
  // bubble was removed for a more professional, real-time voice), so we
  // gate on >= 1 instead of > 1.
  const hasMessages = messages.length >= 1;

  // Dynamic suggestions — contextual chips under the input.
  const suggestions = useMemo(() => {
    if (hasMessages) return [];
    return [
      t("ask_example_1", language),
      t("ask_example_2", language),
      t("ask_example_3", language),
      t("ask_example_4", language),
    ].filter(Boolean);
  }, [hasMessages, language]);

  return (
    <>
      {/* Conversation area */}
      <div className="flex-1 overflow-y-auto scroll-smooth scroll-touch">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-mobile-nav">
          {!hasMessages && (
            <div className="text-center mb-8 animate-fade-up">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-gradient shadow-glow mb-4">
                <Stethoscope size={24} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-ink-base tracking-tight mb-2">
                {t("ask_hero_title", language)}
              </h2>
              <p className="text-ink-muted leading-relaxed max-w-md mx-auto">
                {t("ask_hero_subtitle", language)}
              </p>
              <div className="mt-5">
                <TrustBar language={language} />
              </div>
            </div>
          )}

          {profileWelcome && (
            <ProfileWelcome
              profile={ehrProfile}
              activeMedicationsCount={activeMedicationsCount}
              onDismiss={onDismissProfileWelcome}
            />
          )}

          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              showSourceChip={msg.role === "ai" && i <= 1}
            />
          ))}

          {isTyping && <TypingIndicator label={t("ai_analyzing", language)} />}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Voice listening pill */}
      {isListening && (
        <div className="mx-auto -mb-2 max-w-3xl w-full px-4 sm:px-6">
          <div className="flex items-center justify-center gap-2 py-2 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-600 dark:text-brand-400 text-sm font-medium animate-pulse">
            {t("ask_tap_speak", language)}…
            <button onClick={stopVoice} className="ml-2 opacity-70 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Sticky composer — most important element. Stays above mobile keyboard. */}
      <div className="sticky-bottom-keyboard px-4 sm:px-6 pt-3 pb-5 pb-safe-area bg-gradient-to-t from-surface-0 via-surface-0/95 to-transparent">
        <div className="max-w-3xl mx-auto">
          <HeroInput
            language={language}
            onSend={onSendMessage}
            onStartVoice={startVoice}
            onStopVoice={stopVoice}
            isListening={isListening}
            voiceEnabled={voiceEnabled}
            suggestions={suggestions}
            autoFocus
            // Once the user has sent at least one message, freeze the
            // rotating examples to a single neutral hint. The rotation
            // was bleeding visually into the bot's "Analyzing symptoms…"
            // typing indicator and reading like a canned suggestion.
            staticPlaceholder={hasMessages}
          />
        </div>
      </div>
    </>
  );
}

/**
 * One-time card shown after the user finishes the EHR wizard via
 * "Save & continue chat". The purpose is single: confirm in plain
 * language what the AI now knows so the user feels the payoff before
 * sending their next message. No diagnosis claims, no medical advice —
 * just a factual recap and an "augments, doesn't replace, a clinician"
 * reassurance, matching the enterprise medical-support tone.
 */
function ProfileWelcome({
  profile,
  activeMedicationsCount,
  onDismiss,
}: {
  profile?: EHRProfile;
  activeMedicationsCount: number;
  onDismiss?: () => void;
}) {
  // Build a short factual summary from whatever the user filled in.
  // We intentionally only mention fields that are PRESENT so the card
  // never says "0 medications" or "no conditions known" — both of which
  // read as accusatory for a healthy user just trying out the app.
  const summary = useMemo(() => {
    const p = profile || {};
    const parts: string[] = [];
    let demo = "";
    if (p.dateOfBirth) {
      const t = new Date(p.dateOfBirth).getTime();
      if (Number.isFinite(t)) {
        const age = Math.floor((Date.now() - t) / (365.25 * 86400000));
        if (age >= 0 && age < 130) demo = `${age}-year-old`;
      }
    }
    if (p.gender === "male") demo = demo ? `${demo} man` : "Male";
    else if (p.gender === "female") demo = demo ? `${demo} woman` : "Female";
    if (demo) parts.push(demo);
    if (p.chronicConditions?.length) {
      parts.push(
        p.chronicConditions.length === 1
          ? "1 condition"
          : `${p.chronicConditions.length} conditions`,
      );
    }
    if (activeMedicationsCount > 0) {
      parts.push(
        activeMedicationsCount === 1 ? "1 medication" : `${activeMedicationsCount} medications`,
      );
    }
    if (p.allergies?.length && !p.allergies.includes("None known")) {
      parts.push(
        p.allergies.length === 1 ? "1 allergy" : `${p.allergies.length} allergies`,
      );
    }
    return parts.join(" · ");
  }, [profile, activeMedicationsCount]);

  return (
    <div className="mb-6 rounded-2xl border border-success-500/30 bg-success-500/5 p-4 sm:p-5 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-success-500/15 flex items-center justify-center">
          <CheckCircle2 size={18} className="text-success-500" strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-ink-base text-sm">
            Profile saved — MedOS will tailor its replies
          </p>
          {summary && (
            <p className="mt-0.5 text-xs text-ink-muted truncate">
              {summary}
            </p>
          )}
          <p className="mt-2 text-[11px] text-ink-subtle leading-relaxed">
            Your next question will use this context. This augments, but does not
            replace, a licensed healthcare provider.
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss"
            className="flex-shrink-0 p-1 rounded-md text-ink-subtle hover:text-ink-base hover:bg-surface-2 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
