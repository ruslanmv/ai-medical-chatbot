"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Mic,
  MicOff,
  AlertTriangle,
  Phone,
  X,
  ChevronRight,
  Stethoscope,
  Volume2,
} from "lucide-react";
import { MessageBubble } from "../chat/MessageBubble";
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
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showEmergencyBanner, setShowEmergencyBanner] = useState(false);
  const [showSymptomChecker, setShowSymptomChecker] = useState(false);
  const [symptomStep, setSymptomStep] = useState(0);
  const [symptomData, setSymptomData] = useState<Record<string, string>>({});
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Check for emergency keywords in latest message
  useEffect(() => {
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.role === "user" && detectEmergencyKeywords(last.content, language)) {
        setShowEmergencyBanner(true);
      }
    }
  }, [messages, language]);

  // Read aloud the latest AI message
  useEffect(() => {
    if (!readAloud || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role === "ai" && !isTyping && typeof speechSynthesis !== "undefined") {
      const utterance = new SpeechSynthesisUtterance(last.content);
      utterance.lang = language;
      speechSynthesis.speak(utterance);
    }
  }, [messages, isTyping, readAloud, language]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    onSendMessage(inputValue);
    setInputValue("");
  };

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
      setInputValue(transcript);
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

  const handleSymptomSubmit = () => {
    const parts = [];
    if (symptomData.who) parts.push(`For: ${symptomData.who}`);
    if (symptomData.problem) parts.push(`Problem: ${symptomData.problem}`);
    if (symptomData.duration) parts.push(`Duration: ${symptomData.duration}`);
    if (symptomData.severity) parts.push(`Severity: ${symptomData.severity}`);

    const message = `I need help with a health concern. ${parts.join(". ")}.`;
    onSendMessage(message);
    setShowSymptomChecker(false);
    setSymptomStep(0);
    setSymptomData({});
  };

  const hasMessages = messages.length > 1;

  return (
    <>
      {/* Emergency auto-detection banner */}
      {showEmergencyBanner && (
        <div className="bg-red-600 text-white p-4 flex items-center gap-3 animate-in fade-in">
          <AlertTriangle size={24} className="flex-shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-base">{t("emergency_may_be", language)}</p>
            <p className="text-sm text-red-100">{t("emergency_call_now", language)}</p>
          </div>
          <a
            href={`tel:${emergencyNumber}`}
            className="px-5 py-2.5 bg-white text-red-600 rounded-xl font-bold text-sm flex items-center gap-2 flex-shrink-0 hover:bg-red-50 transition-colors"
          >
            <Phone size={16} />
            {t("emergency_call", language)} {emergencyNumber}
          </a>
          <button
            onClick={() => setShowEmergencyBanner(false)}
            className="text-red-200 hover:text-white p-1"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Symptom checker overlay */}
      {showSymptomChecker && (
        <div className="absolute inset-0 bg-white z-30 flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">{t("ask_symptom_check", language)}</h3>
            <button onClick={() => { setShowSymptomChecker(false); setSymptomStep(0); }} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 p-6 flex flex-col items-center justify-center">
            {symptomStep === 0 && (
              <div className="w-full max-w-sm">
                <h4 className="text-lg font-bold text-slate-800 mb-4 text-center">{t("symptom_who", language)}</h4>
                <div className="space-y-3">
                  {["symptom_me", "symptom_child", "symptom_other"].map((key) => (
                    <button
                      key={key}
                      onClick={() => { setSymptomData(d => ({ ...d, who: t(key, language) })); setSymptomStep(1); }}
                      className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl text-left font-medium text-slate-700 hover:border-blue-500 hover:bg-blue-50 transition-all"
                    >
                      {t(key, language)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {symptomStep === 1 && (
              <div className="w-full max-w-sm">
                <h4 className="text-lg font-bold text-slate-800 mb-4 text-center">{t("symptom_main", language)}</h4>
                <div className="grid grid-cols-2 gap-3">
                  {["symptom_pain", "symptom_fever", "symptom_cough", "symptom_breathing", "symptom_stomach", "symptom_skin", "symptom_mental"].map((key) => (
                    <button
                      key={key}
                      onClick={() => { setSymptomData(d => ({ ...d, problem: t(key, language) })); setSymptomStep(2); }}
                      className="p-4 bg-white border-2 border-slate-200 rounded-2xl text-center font-medium text-slate-700 hover:border-blue-500 hover:bg-blue-50 transition-all"
                    >
                      {t(key, language)}
                    </button>
                  ))}
                </div>
                <button onClick={() => setSymptomStep(0)} className="mt-4 text-sm text-blue-600 font-medium">{t("symptom_back", language)}</button>
              </div>
            )}
            {symptomStep === 2 && (
              <div className="w-full max-w-sm">
                <h4 className="text-lg font-bold text-slate-800 mb-4 text-center">{t("symptom_severity", language)}</h4>
                <div className="space-y-3">
                  {["symptom_mild", "symptom_moderate", "symptom_severe"].map((key) => (
                    <button
                      key={key}
                      onClick={() => { setSymptomData(d => ({ ...d, severity: t(key, language) })); setSymptomStep(3); }}
                      className={`w-full p-4 border-2 rounded-2xl text-left font-medium transition-all ${
                        key === "symptom_severe"
                          ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                          : key === "symptom_moderate"
                          ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-200"
                      }`}
                    >
                      {t(key, language)}
                    </button>
                  ))}
                </div>
                <button onClick={() => setSymptomStep(1)} className="mt-4 text-sm text-blue-600 font-medium">{t("symptom_back", language)}</button>
              </div>
            )}
            {symptomStep === 3 && (
              <div className="w-full max-w-sm text-center">
                <Stethoscope size={48} className="mx-auto text-blue-500 mb-4" />
                <h4 className="text-lg font-bold text-slate-800 mb-2">{t("symptom_submit", language)}</h4>
                <div className="bg-slate-50 rounded-2xl p-4 mb-6 text-left text-sm text-slate-600 space-y-1">
                  {symptomData.who && <p><strong>{t("symptom_who", language)}:</strong> {symptomData.who}</p>}
                  {symptomData.problem && <p><strong>{t("symptom_main", language)}:</strong> {symptomData.problem}</p>}
                  {symptomData.severity && <p><strong>{t("symptom_severity", language)}:</strong> {symptomData.severity}</p>}
                </div>
                <button
                  onClick={handleSymptomSubmit}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-base hover:bg-blue-700 transition-colors"
                >
                  {t("symptom_submit", language)}
                </button>
                <button onClick={() => setSymptomStep(2)} className="mt-3 text-sm text-blue-600 font-medium">{t("symptom_back", language)}</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
        <div className="max-w-3xl mx-auto">
          {/* Welcome prompt when no conversation yet */}
          {!hasMessages && (
            <div className="text-center mb-8 mt-4">
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                {t("ask_headline", language)}
              </h2>

              {/* Example prompts */}
              <div className="flex flex-wrap gap-2 justify-center mb-6 mt-4">
                {["ask_example_1", "ask_example_2", "ask_example_3", "ask_example_4"].map((key) => (
                  <button
                    key={key}
                    onClick={() => onSendMessage(t(key, language))}
                    className="px-4 py-2.5 bg-white rounded-full border border-slate-200 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all"
                  >
                    &ldquo;{t(key, language)}&rdquo;
                  </button>
                ))}
              </div>

              {/* Symptom checker button */}
              <button
                onClick={() => setShowSymptomChecker(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-50 border border-blue-200 rounded-2xl text-blue-700 font-semibold hover:bg-blue-100 transition-colors"
              >
                <Stethoscope size={18} />
                {t("ask_symptom_check", language)}
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {isTyping && (
            <div className="flex gap-2 mb-6 ml-4">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200" />
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 sm:p-6 bg-white border-t border-slate-100">
        <div className="max-w-3xl mx-auto">
          {/* Voice listening indicator */}
          {isListening && (
            <div className="flex items-center justify-center gap-2 mb-3 py-2 bg-indigo-50 rounded-xl border border-indigo-200 animate-pulse">
              <Mic size={16} className="text-indigo-600" />
              <span className="text-sm font-medium text-indigo-700">
                {t("ask_tap_speak", language)}...
              </span>
              <button onClick={stopVoice} className="text-indigo-400 hover:text-indigo-600 ml-2">
                <X size={16} />
              </button>
            </div>
          )}

          <div className="relative flex items-center gap-2">
            {/* Voice button - primary and large */}
            {voiceEnabled && (
              <button
                onClick={isListening ? stopVoice : startVoice}
                className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  isListening
                    ? "bg-red-500 text-white shadow-lg shadow-red-200 animate-pulse"
                    : "bg-indigo-500 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-600"
                }`}
                title={t("ask_tap_speak", language)}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            )}

            {/* Text input */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={t("ask_placeholder", language)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-5 pr-14 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              />
              <button
                onClick={handleSend}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all ${
                  inputValue.trim()
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                    : "bg-slate-200 text-slate-400"
                }`}
              >
                <Send size={18} />
              </button>
            </div>

            {/* Emergency shortcut - always visible */}
            <button
              onClick={onNavigateEmergency}
              className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 hover:bg-red-200 transition-colors"
              title={t("home_emergency", language)}
            >
              <AlertTriangle size={18} className="text-red-600" />
            </button>
          </div>

          <div className="text-center mt-2 text-[11px] text-slate-400">
            {t("ask_disclaimer", language)}
          </div>
        </div>
      </div>
    </>
  );
}
