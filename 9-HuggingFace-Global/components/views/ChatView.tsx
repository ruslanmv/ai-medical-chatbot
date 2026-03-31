'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import type { ChatMessage } from '../MedOSGlobalApp';
import type { SupportedLanguage } from '@/lib/i18n';
import MessageBubble from '../chat/MessageBubble';
import TypingIndicator from '../chat/TypingIndicator';
import VoiceInput from '../chat/VoiceInput';
import QuickChips from '../chat/QuickChips';
import { trackSession } from '@/lib/analytics/anonymous-tracker';

interface ChatViewProps {
  messages: ChatMessage[];
  isLoading: boolean;
  language: SupportedLanguage;
  onSendMessage: (message: string) => void;
}

const DEFAULT_TOPICS = [
  'Headache', 'Fever', 'Cough', 'Diabetes',
  'Blood Pressure', 'Pregnancy', 'Mental Health', 'Child Health',
];

export default function ChatView({
  messages,
  isLoading,
  language,
  onSendMessage,
}: ChatViewProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
              <span className="text-3xl">&#x1F3E5;</span>
            </div>
            <h2 className="text-xl font-bold text-slate-200 mb-2">
              Welcome to MedOS
            </h2>
            <p className="text-sm text-slate-400 mb-6 max-w-md">
              Ask any health question. I provide general medical information in
              your language — free, private, and always available.
            </p>

            {/* Quick Start Topics */}
            <QuickChips topics={DEFAULT_TOPICS} onSelect={handleQuickTopic} />
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isLoading &&
          messages[messages.length - 1]?.content === '' && (
            <TypingIndicator />
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
              placeholder="Type your health question..."
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
            className="touch-target rounded-xl p-2.5 bg-medical-primary text-white
                       hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed
                       transition-all duration-200 active:scale-95"
            aria-label="Send message"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
