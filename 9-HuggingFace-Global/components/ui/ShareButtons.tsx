'use client';

import { useState, useEffect } from 'react';

interface ShareButtonsProps {
  url: string;
  language: string;
}

const SHARE_MESSAGE =
  'I just got free AI medical advice! Try MediBot - free, works in 20 languages, no sign-up needed:';

export default function ShareButtons({ url }: ShareButtonsProps) {
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && 'share' in navigator);
  }, []);

  const encodedUrl = encodeURIComponent(url);
  const encodedMessage = encodeURIComponent(`${SHARE_MESSAGE} ${url}`);

  const platforms = [
    { name: 'WhatsApp', href: `https://wa.me/?text=${encodedMessage}`, color: 'bg-green-600 hover:bg-green-500', label: 'WA' },
    { name: 'Telegram', href: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(SHARE_MESSAGE)}`, color: 'bg-blue-500 hover:bg-blue-400', label: 'TG' },
    { name: 'Twitter', href: `https://twitter.com/intent/tweet?text=${encodedMessage}`, color: 'bg-slate-700 hover:bg-slate-600', label: 'X' },
    { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, color: 'bg-blue-700 hover:bg-blue-600', label: 'FB' },
    { name: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, color: 'bg-blue-800 hover:bg-blue-700', label: 'LI' },
  ];

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'MediBot - Free AI Medical Assistant', text: SHARE_MESSAGE, url });
      } catch { /* user cancelled */ }
    }
  };

  return (
    <div className="space-y-3">
      {canShare && (
        <button onClick={handleNativeShare}
          className="w-full py-3 rounded-xl bg-medical-primary hover:bg-blue-500
                     text-white text-sm font-semibold transition-colors touch-target">
          Share via...
        </button>
      )}
      <div className="grid grid-cols-5 gap-2">
        {platforms.map((p) => (
          <a key={p.name} href={p.href} target="_blank" rel="noopener noreferrer"
            className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl ${p.color} text-white transition-colors touch-target`}>
            <span className="text-sm font-bold">{p.label}</span>
            <span className="text-[9px] opacity-80">{p.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
