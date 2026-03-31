'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { hapticFeedback } from '@/lib/mobile/touch';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  language: string;
}

function getSpeechRecognitionClass(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export default function VoiceInput({ onTranscript, language }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Check support only on client after mount
  useEffect(() => {
    setIsSupported(!!getSpeechRecognitionClass());
  }, []);

  const toggleListening = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognitionClass();
    if (!SpeechRecognitionCtor) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    hapticFeedback('medium');

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = getRecognitionLang(language);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) {
        onTranscript(transcript.trim());
      }
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, language, onTranscript]);

  // Render nothing until we know if supported (avoids hydration mismatch)
  if (!isSupported) return null;

  return (
    <button
      onClick={toggleListening}
      className={`
        touch-target rounded-full p-2.5 transition-all duration-200
        ${isListening
          ? 'bg-red-500 text-white voice-recording'
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        }
      `}
      aria-label={isListening ? 'Stop recording' : 'Start voice input'}
    >
      {isListening ? <MicOff size={20} /> : <Mic size={20} />}
    </button>
  );
}

function getRecognitionLang(lang: string): string {
  const langMap: Record<string, string> = {
    en: 'en-US', es: 'es-ES', zh: 'zh-CN', hi: 'hi-IN', ar: 'ar-SA',
    pt: 'pt-BR', bn: 'bn-BD', fr: 'fr-FR', ru: 'ru-RU', ja: 'ja-JP',
    de: 'de-DE', ko: 'ko-KR', tr: 'tr-TR', vi: 'vi-VN', it: 'it-IT',
    th: 'th-TH', id: 'id-ID', sw: 'sw-KE', tl: 'tl-PH', uk: 'uk-UA',
  };
  return langMap[lang] || 'en-US';
}
