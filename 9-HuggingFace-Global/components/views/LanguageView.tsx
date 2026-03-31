'use client';

import { Check } from 'lucide-react';
import { LANGUAGE_META, type SupportedLanguage } from '@/lib/i18n';
import { hapticFeedback } from '@/lib/mobile/touch';

interface LanguageViewProps {
  currentLanguage: SupportedLanguage;
  onSelectLanguage: (lang: SupportedLanguage) => void;
}

const LANGUAGE_ORDER: SupportedLanguage[] = [
  'en', 'es', 'zh', 'hi', 'ar', 'pt', 'bn', 'fr', 'ru', 'ja',
  'de', 'ko', 'tr', 'vi', 'it', 'th', 'id', 'sw', 'tl', 'uk',
];

export default function LanguageView({
  currentLanguage,
  onSelectLanguage,
}: LanguageViewProps) {
  return (
    <div className="flex-1 overflow-y-auto scroll-smooth">
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-700/50">
        <h2 className="text-lg font-bold text-slate-100">Language</h2>
        <p className="text-sm text-slate-400 mt-1">
          MedOS responds in your chosen language
        </p>
      </div>

      {/* Language List */}
      <div className="p-4 space-y-1">
        {LANGUAGE_ORDER.map((lang) => {
          const meta = LANGUAGE_META[lang];
          const isSelected = lang === currentLanguage;

          return (
            <button
              key={lang}
              onClick={() => {
                hapticFeedback('light');
                onSelectLanguage(lang);
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl
                touch-target transition-all duration-200
                ${isSelected
                  ? 'bg-medical-primary/10 border border-medical-primary/30 text-slate-100'
                  : 'hover:bg-slate-800 text-slate-300'
                }
              `}
            >
              <span className="text-2xl">{meta.flag}</span>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">{meta.nativeName}</p>
                <p className="text-xs text-slate-500">{meta.name}</p>
              </div>
              {meta.rtl && (
                <span className="text-xs text-slate-600 px-2 py-0.5 rounded bg-slate-800">
                  RTL
                </span>
              )}
              {isSelected && (
                <Check size={18} className="text-medical-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
