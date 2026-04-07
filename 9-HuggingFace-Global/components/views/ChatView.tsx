"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { AlertTriangle, Phone, X, ChevronRight, Stethoscope } from "lucide-react";
import { MessageBubble } from "../chat/MessageBubble";
import { HeroInput } from "../chat/HeroInput";
import { TypingIndicator } from "../chat/TypingIndicator";
import { TrustBar } from "../chat/TrustBar";
import type { ChatMessage } from "@/lib/hooks/useChat";
import { t, detectEmergencyKeywords, type SupportedLanguage } from "@/lib/i18n";

interface ChatViewProps {
  messages: ChatMessage[];
  isTyping: boolean;
  onSendMessage: (content: string) => void;
  language?: SupportedLanguage;
  emergencyNumber?: string;
  voiceEnabled?: boolean;
  readAloud?: boolean;
  onNavigateEmergency?: () => void;
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
}: ChatViewProps) {
  const [isListening, setIsListening] = useState(false);
  const [showEmergencyBanner, setShowEmergencyBanner] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Red-flag auto-detection on latest user message.
  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role === "user" && detectEmergencyKeywords(last.content, language)) {
      setShowEmergencyBanner(true);
    }
  }, [messages, language]);

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

  const hasMessages = messages.length > 1;

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
      {/* Red-flag emergency banner */}
      {showEmergencyBanner && (
        <div className="relative z-10 bg-danger-500 text-white p-4 flex items-center gap-3 animate-fade-up shadow-danger-glow">
          <AlertTriangle size={24} className="flex-shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-base">
              {t("emergency_may_be", language)}
            </p>
            <p className="text-sm text-white/85">
              {t("emergency_call_now", language)}
            </p>
          </div>
          <a
            href={`tel:${emergencyNumber}`}
            className="px-5 py-2.5 bg-white text-danger-600 rounded-xl font-bold text-sm flex items-center gap-2 flex-shrink-0 hover:bg-white/90 transition-colors"
          >
            <Phone size={16} />
            {t("emergency_call", language)} {emergencyNumber}
          </a>
          <button
            onClick={() => setShowEmergencyBanner(false)}
            className="text-white/75 hover:text-white p-1"
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Conversation area */}
      <div className="flex-1 overflow-y-auto scroll-smooth">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
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
          />
          <div className="flex items-center justify-between mt-3 px-1">
            <p className="text-[11px] text-ink-subtle">
              {t("ask_disclaimer", language)}
            </p>
            <button
              onClick={onNavigateEmergency}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-danger-500 hover:text-danger-600"
            >
              <AlertTriangle size={11} />
              {t("home_emergency", language)}
              <ChevronRight size={11} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
