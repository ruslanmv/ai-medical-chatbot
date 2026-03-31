'use client';

import { AlertTriangle } from 'lucide-react';
import type { ChatMessage } from '../MedOSGlobalApp';

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isEmergency = message.isEmergency;

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
    >
      <div
        className={`
          max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3
          ${isUser
            ? 'bg-medical-primary text-white message-user'
            : isEmergency
              ? 'bg-red-950/50 border border-red-700/50 text-slate-100 message-bot'
              : 'bg-slate-800 border border-slate-700/50 text-slate-100 message-bot'
          }
        `}
      >
        {/* Emergency indicator */}
        {isEmergency && !isUser && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-red-700/30">
            <AlertTriangle size={16} className="text-red-400" />
            <span className="text-xs font-semibold text-red-300 uppercase">
              Emergency Detected
            </span>
          </div>
        )}

        {/* Message content with basic markdown */}
        <div className="message-content text-sm leading-relaxed whitespace-pre-wrap">
          {renderMarkdown(message.content)}
        </div>

        {/* Timestamp */}
        <div
          className={`text-xs mt-1 ${isUser ? 'text-blue-200' : 'text-slate-500'}`}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}

function renderMarkdown(text: string): React.ReactNode {
  // Simple markdown rendering: bold, code, line breaks
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\n)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-slate-50">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="bg-slate-700/50 px-1.5 py-0.5 rounded text-xs">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part === '\n') {
      return <br key={i} />;
    }
    return <span key={i}>{part}</span>;
  });
}
