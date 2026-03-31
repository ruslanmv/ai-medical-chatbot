'use client';

export default function TypingIndicator() {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="bg-slate-800 border border-slate-700/50 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-1.5">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
    </div>
  );
}
