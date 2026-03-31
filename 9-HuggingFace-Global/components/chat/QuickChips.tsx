'use client';

import { hapticFeedback } from '@/lib/mobile/touch';

interface QuickChipsProps {
  topics: string[];
  onSelect: (topic: string) => void;
}

export default function QuickChips({ topics, onSelect }: QuickChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 px-4 py-3">
      {topics.map((topic) => (
        <button
          key={topic}
          onClick={() => {
            hapticFeedback('light');
            onSelect(`I have a question about ${topic.toLowerCase()}`);
          }}
          className="px-3.5 py-2 rounded-full bg-slate-800 border border-slate-700/50
                     text-sm text-slate-300 hover:bg-slate-700 hover:text-slate-100
                     hover:border-medical-primary/30 transition-all duration-200
                     touch-target whitespace-nowrap active:scale-95"
        >
          {topic}
        </button>
      ))}
    </div>
  );
}
