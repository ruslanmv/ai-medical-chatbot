"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  language: string;
  /** Compact = just the icon button. Full = button with label. */
  compact?: boolean;
}

function getSpeechRecognitionClass(): any {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

const LANG_MAP: Record<string, string> = {
  en: "en-US", es: "es-ES", zh: "zh-CN", hi: "hi-IN", ar: "ar-SA",
  pt: "pt-BR", bn: "bn-BD", fr: "fr-FR", ru: "ru-RU", ja: "ja-JP",
  de: "de-DE", ko: "ko-KR", tr: "tr-TR", vi: "vi-VN", it: "it-IT",
  th: "th-TH", id: "id-ID", sw: "sw-KE", pl: "pl-PL", nl: "nl-NL",
  ur: "ur-PK",
};

export function VoiceInput({ onTranscript, language, compact }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setIsSupported(!!getSpeechRecognitionClass());
  }, []);

  const toggle = useCallback(() => {
    const Ctor = getSpeechRecognitionClass();
    if (!Ctor) return;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = LANG_MAP[language] || "en-US";
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript?.trim()) onTranscript(transcript.trim());
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, language, onTranscript]);

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex items-center justify-center gap-1.5 rounded-full transition-all ${
        isListening
          ? "bg-danger-500 text-white animate-pulse shadow-danger-glow"
          : compact
          ? "bg-surface-2 text-ink-muted hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30"
          : "bg-surface-2 text-ink-muted hover:text-brand-600"
      } ${compact ? "w-10 h-10" : "px-3 py-2"}`}
      aria-label={isListening ? "Stop recording" : "Start voice input"}
    >
      {isListening ? <MicOff size={compact ? 16 : 14} /> : <Mic size={compact ? 16 : 14} />}
      {!compact && (
        <span className="text-xs font-semibold">
          {isListening ? "Stop" : "Voice"}
        </span>
      )}
    </button>
  );
}
