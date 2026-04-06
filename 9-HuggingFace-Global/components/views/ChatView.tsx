'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import type { ChatMessage } from '../MedOSGlobalApp';
import type { SupportedLanguage } from '@/lib/i18n';
import MessageBubble from '../chat/MessageBubble';
import TypingIndicator from '../chat/TypingIndicator';
import VoiceInput from '../chat/VoiceInput';
import QuickChips from '../chat/QuickChips';
import TrustBar from '../chat/TrustBar';
import { trackSession } from '@/lib/analytics/anonymous-tracker';
import { readPrefillQuery } from '@/lib/share';
import { suggestFollowUps } from '@/lib/follow-ups';
import { HERO_VARIANTS, pickVariant } from '@/lib/ab-variant';

interface ChatViewProps {
  messages: ChatMessage[];
  isLoading: boolean;
  language: SupportedLanguage;
  onSendMessage: (message: string) => void;
}

const DEFAULT_TOPICS = [
  'Headache',
  'Fever',
  'Cough',
  'Diabetes',
  'Blood Pressure',
  'Pregnancy',
  'Mental Health',
  'Child Health',
];

// Rotating empathetic placeholders — one of the single biggest virality
// levers for a medical chatbot. Users see an example of exactly how to
// phrase their concern.
const ROTATING_PLACEHOLDERS = [
  'I have chest pain since this morning…',
  'My child has a fever of 39 °C…',
  'I\'ve had a headache for three days…',
  'Is this medication safe with pregnancy?',
  'I feel anxious and can\'t sleep…',
];

export default function ChatView({
  messages,
  isLoading,
  language,
  onSendMessage,
}: ChatViewProps) {
  const [input, setInput] = useState('');
  const [rotIdx, setRotIdx] = useState(0);
  // Deterministic A/B variant — picked once per visitor and persisted.
  // Default to 0 for SSR; effect hydrates the real selection on mount.
  const [variant, setVariant] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prefillHandled = useRef(false);

  // Auto-scroll on new messages.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Rotate the placeholder every 3.2 s while the input is empty.
  useEffect(() => {
    if (input) return;
    const id = setInterval(
      () => setRotIdx((i) => (i + 1) % ROTATING_PLACEHOLDERS.length),
      3200,
    );
    return () => clearInterval(id);
  }, [input]);

  // Pick the A/B hero variant once on mount.
  useEffect(() => {
    setVariant(pickVariant(HERO_VARIANTS.length));
  }, []);

  // Viral entry point: `?q=` in the URL pre-fills the input and auto-sends
  // once, so a shared link becomes an instant conversation starter.
  useEffect(() => {
    if (prefillHandled.current) return;
    const q = readPrefillQuery();
    if (q) {
      prefillHandled.current = true;
      const url = new URL(window.location.href);
      url.searchParams.delete('q');
      window.history.replaceState({}, '', url.toString());
      trackSession();
      onSendMessage(q);
    }
  }, [onSendMessage]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    trackSession();
    onSendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceTranscript = (text: string) => {
    trackSession();
    onSendMessage(text);
  };

  const handleQuickTopic = (topic: string) => {
    trackSession();
    onSendMessage(topic);
  };

  // Look up the user question that triggered each assistant message, so
  // the assistant bubble's Share button can build a clean deep link.
  const sourceQuestionFor = (index: number): string | undefined => {
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return messages[i].content;
    }
    return undefined;
  };

  // Show CONTEXTUAL follow-up chips derived from the latest AI answer.
  // `suggestFollowUps` scans medical keywords and picks topical prompts,
  // falling back to universal defaults when nothing matches.
  const lastMessage = messages[messages.length - 1];
  const showFollowUps =
    !isLoading &&
    messages.length > 0 &&
    lastMessage?.role === 'assistant' &&
    lastMessage.content.length > 40;
  const followUps = useMemo(
    () =>
      showFollowUps && lastMessage
        ? suggestFollowUps(lastMessage.content, 4)
        : [],
    [showFollowUps, lastMessage],
  );

  const hero = HERO_VARIANTS[variant] ?? HERO_VARIANTS[0];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Mobile Header */}
      <div className="mobile-header-compact flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
        <h1 className="text-lg font-bold text-slate-50">
          <span className="text-medical-primary">Med</span>OS
        </h1>
        <span className="text-xs text-slate-500">Free AI Medical Assistant</span>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto scroll-smooth px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
              <span className="text-3xl">&#x1F3E5;</span>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-400 mb-2">
              {hero.eyebrow}
            </p>
            <h2 className="text-2xl font-bold text-slate-100 mb-2 tracking-tight max-w-md">
              {hero.title}
            </h2>
            <p className="text-sm text-slate-400 mb-5 max-w-md leading-relaxed">
              {hero.subtitle}
            </p>
            <div className="mb-6">
              <TrustBar />
            </div>
            <QuickChips topics={DEFAULT_TOPICS} onSelect={handleQuickTopic} />
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            sourceQuestion={msg.role === 'assistant' ? sourceQuestionFor(i) : undefined}
            language={language}
          />
        ))}

        {isLoading && messages[messages.length - 1]?.content === '' && (
          <TypingIndicator />
        )}

        {/* Contextual follow-up suggestion chips */}
        {showFollowUps && followUps.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pl-1 pt-2 animate-fade-in">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-teal-400">
              <Sparkles size={11} />
              Follow up
            </span>
            {followUps.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  trackSession();
                  onSendMessage(f.prompt);
                }}
                className="px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-medium text-slate-300 hover:text-teal-200 hover:border-teal-500/50 hover:bg-teal-500/10 transition-all"
              >
                {f.prompt}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-slate-700/50 bg-slate-900/95 px-4 py-3">
        <div className="flex items-center gap-2 chat-input-area">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={ROTATING_PLACEHOLDERS[rotIdx]}
              className="w-full bg-slate-800 border border-slate-700/50 rounded-xl
                         px-4 py-3 text-sm text-slate-100 placeholder-slate-500
                         focus:outline-none focus:ring-2 focus:ring-medical-primary/50
                         focus:border-medical-primary/50 transition-all"
              disabled={isLoading}
            />
          </div>

          <VoiceInput onTranscript={handleVoiceTranscript} language={language} />

          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="touch-target rounded-xl p-2.5 bg-gradient-to-br from-blue-500 to-teal-500 text-white
                       hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed
                       transition-all duration-200 active:scale-95 shadow-lg shadow-blue-500/20"
            aria-label="Send message"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
