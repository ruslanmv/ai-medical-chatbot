'use client';

import { AlertTriangle } from 'lucide-react';
import { getDisclaimer } from '@/lib/safety/disclaimer';
import type { SupportedLanguage } from '@/lib/i18n';

interface DisclaimerBannerProps {
  language: SupportedLanguage;
}

export default function DisclaimerBanner({ language }: DisclaimerBannerProps) {
  const disclaimer = getDisclaimer(language);

  return (
    <div className="flex-shrink-0 px-4 py-2 bg-slate-800/50 border-t border-slate-700/30">
      <div className="flex items-start gap-2">
        <AlertTriangle
          size={12}
          className="text-amber-500/70 mt-0.5 flex-shrink-0"
        />
        <p className="text-[10px] text-slate-500 leading-relaxed">
          {disclaimer}
        </p>
      </div>
    </div>
  );
}
