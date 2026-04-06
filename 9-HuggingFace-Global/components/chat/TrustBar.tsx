'use client';

import { ShieldCheck, Globe2, Clock4 } from 'lucide-react';

/**
 * Compact trust strip shown below the hero headline on the empty chat
 * state and on symptom landing pages. Three icons, three short phrases,
 * one color: muted teal. Communicates clinical credibility without
 * looking salesy.
 */
export default function TrustBar() {
  const items = [
    { Icon: ShieldCheck, text: 'Aligned with WHO · CDC · NHS' },
    { Icon: Globe2,      text: 'Private & anonymous' },
    { Icon: Clock4,      text: 'Available 24/7' },
  ];
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-400">
      {items.map(({ Icon, text }) => (
        <span key={text} className="inline-flex items-center gap-1.5 font-medium">
          <Icon size={13} className="text-teal-400" />
          {text}
        </span>
      ))}
    </div>
  );
}
