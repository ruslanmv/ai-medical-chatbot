'use client';

import { useState, useRef } from 'react';
import {
  AlertTriangle,
  Share2,
  Link as LinkIcon,
  Copy,
  Check,
  Volume2,
  VolumeX,
  ShieldCheck,
} from 'lucide-react';
import type { ChatMessage } from '../MedOSGlobalApp';
import { shareMessage, buildShareUrl } from '@/lib/share';
import {
  estimateConfidence,
  extractCitations,
  CONFIDENCE_LABELS,
  CONFIDENCE_COLORS,
} from '@/lib/answer-quality';

interface MessageBubbleProps {
  message: ChatMessage;
  /** The user question that produced this assistant answer (shareable). */
  sourceQuestion?: string;
  /** Language code carried into share URLs + TTS playback. */
  language?: string;
}

type ActionState = 'idle' | 'copied-text' | 'copied-link' | 'shared';

export default function MessageBubble({
  message,
  sourceQuestion,
  language = 'en',
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isEmergency = message.isEmergency;

  const [actionState, setActionState] = useState<ActionState>('idle');
  const [isPlaying, setIsPlaying] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isAssistant = !isUser && message.content.length > 0;
  const hasSource = !!sourceQuestion;

  // Answer-quality signals — computed once per render, pure functions.
  const confidence = isAssistant ? estimateConfidence(message.content) : null;
  const citations = isAssistant ? extractCitations(message.content) : [];

  const flash = (s: ActionState) => {
    setActionState(s);
    window.setTimeout(() => setActionState('idle'), 2200);
  };

  const handleShare = async () => {
    if (!sourceQuestion) return;
    const result = await shareMessage(sourceQuestion, language);
    if (result === 'shared') flash('shared');
    else if (result === 'copied') flash('copied-link');
  };

  const handleCopyLink = async () => {
    if (!sourceQuestion) return;
    try {
      const url = buildShareUrl(sourceQuestion, language);
      await navigator.clipboard.writeText(url);
      flash('copied-link');
    } catch {
      /* ignore */
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      flash('copied-text');
    } catch {
      /* ignore */
    }
  };

  const handleToggleListen = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }
    // Strip Markdown emphasis markers so TTS doesn't read them aloud.
    const plain = message.content.replace(/\*\*|`/g, '').trim();
    const u = new SpeechSynthesisUtterance(plain);
    u.lang = language;
    u.rate = 1.02;
    u.onend = () => setIsPlaying(false);
    u.onerror = () => setIsPlaying(false);
    utterRef.current = u;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setIsPlaying(true);
  };

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
    >
      <div
        className={`
          max-w-[88%] md:max-w-[72%] rounded-2xl px-4 py-3
          ${
            isUser
              ? 'bg-medical-primary text-white message-user'
              : isEmergency
                ? 'bg-red-950/50 border border-red-700/50 text-slate-100 message-bot'
                : 'bg-slate-800 border border-slate-700/50 text-slate-100 message-bot'
          }
        `}
      >
        {/* Assistant header: confidence + citation chips */}
        {isAssistant && (confidence || citations.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 mb-2 pb-2 border-b border-slate-700/40">
            {confidence && (
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider border px-2 py-0.5 rounded-full ${CONFIDENCE_COLORS[confidence]}`}
                title={`Confidence: ${confidence}`}
              >
                <ShieldCheck size={10} />
                {CONFIDENCE_LABELS[confidence]}
              </span>
            )}
            {citations.map((c) => (
              <a
                key={c.id}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-teal-300 border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 rounded-full hover:bg-teal-500/20 transition-colors"
                title={`Open ${c.label} in a new tab`}
              >
                {c.label}
              </a>
            ))}
          </div>
        )}

        {/* Emergency indicator */}
        {isEmergency && !isUser && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-red-700/30">
            <AlertTriangle size={16} className="text-red-400" />
            <span className="text-xs font-semibold text-red-300 uppercase">
              Emergency Detected
            </span>
          </div>
        )}

        {/* Message body */}
        <div className="message-content text-sm leading-relaxed whitespace-pre-wrap">
          {renderMarkdown(message.content)}
        </div>

        {/* Footer: timestamp + action row */}
        <div
          className={`flex items-center justify-between mt-2 gap-3 flex-wrap ${
            isUser ? 'text-blue-200' : 'text-slate-500'
          }`}
        >
          <span className="text-xs">
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>

          {isAssistant && (
            <div className="flex items-center gap-1">
              <ActionButton
                active={actionState === 'copied-text'}
                onClick={handleCopyText}
                label={actionState === 'copied-text' ? 'Copied' : 'Copy'}
                Icon={actionState === 'copied-text' ? Check : Copy}
                activeColor="text-teal-300"
                title="Copy answer text"
              />

              {'speechSynthesis' in (globalThis as any) && (
                <ActionButton
                  active={isPlaying}
                  onClick={handleToggleListen}
                  label={isPlaying ? 'Stop' : 'Listen'}
                  Icon={isPlaying ? VolumeX : Volume2}
                  activeColor="text-teal-300"
                  title={isPlaying ? 'Stop reading' : 'Read answer aloud'}
                />
              )}

              {hasSource && (
                <>
                  <ActionButton
                    active={actionState === 'copied-link'}
                    onClick={handleCopyLink}
                    label={actionState === 'copied-link' ? 'Copied' : 'Link'}
                    Icon={actionState === 'copied-link' ? Check : LinkIcon}
                    activeColor="text-teal-300"
                    title="Copy shareable link"
                  />
                  <ActionButton
                    active={actionState === 'shared'}
                    onClick={handleShare}
                    label={actionState === 'shared' ? 'Shared' : 'Share'}
                    Icon={actionState === 'shared' ? Check : Share2}
                    activeColor="text-teal-300"
                    title="Share this answer"
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  active,
  onClick,
  label,
  Icon,
  activeColor,
  title,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  Icon: any;
  activeColor: string;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-1 rounded transition-colors ${
        active
          ? activeColor
          : 'text-slate-400 hover:text-teal-300 hover:bg-slate-700/40'
      }`}
    >
      <Icon size={12} />
      <span className="hidden sm:inline">{label}</span>
    </button>
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
