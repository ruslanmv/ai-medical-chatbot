'use client';

import { WifiOff } from 'lucide-react';
import type { SupportedLanguage } from '@/lib/i18n';

interface OfflineBannerProps {
  language: SupportedLanguage;
}

const OFFLINE_MESSAGES: Record<string, string> = {
  en: "You're offline. Showing cached answers.",
  es: 'Estás sin conexión. Mostrando respuestas guardadas.',
  zh: '您已离线。正在显示缓存的回答。',
  hi: 'आप ऑफलाइन हैं। सहेजे गए उत्तर दिखा रहे हैं।',
  ar: 'أنت غير متصل. عرض الإجابات المحفوظة.',
  pt: 'Você está offline. Mostrando respostas salvas.',
  fr: 'Vous êtes hors ligne. Affichage des réponses en cache.',
  ru: 'Вы офлайн. Показаны сохранённые ответы.',
  ja: 'オフラインです。保存された回答を表示しています。',
  de: 'Sie sind offline. Gespeicherte Antworten werden angezeigt.',
};

export default function OfflineBanner({ language }: OfflineBannerProps) {
  const message =
    OFFLINE_MESSAGES[language] || OFFLINE_MESSAGES.en;

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-900/30 border-b border-amber-700/30">
      <WifiOff size={14} className="text-amber-400" />
      <p className="text-xs text-amber-300">{message}</p>
    </div>
  );
}
