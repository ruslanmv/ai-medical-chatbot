'use client';

import { MessageSquare, BookOpen, AlertTriangle, Settings, Share2 } from 'lucide-react';
import type { ViewType } from '../MedOSGlobalApp';
import type { SupportedLanguage } from '@/lib/i18n';
import { hapticFeedback } from '@/lib/mobile/touch';

interface BottomNavProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  language: SupportedLanguage;
}

const NAV_ITEMS: Array<{
  id: ViewType;
  icon: typeof MessageSquare;
  label: string;
}> = [
  { id: 'chat', icon: MessageSquare, label: 'Chat' },
  { id: 'topics', icon: BookOpen, label: 'Topics' },
  { id: 'emergency', icon: AlertTriangle, label: 'SOS' },
  { id: 'share', icon: Share2, label: 'Share' },
  { id: 'settings', icon: Settings, label: 'More' },
];

export default function BottomNav({
  currentView,
  onNavigate,
}: BottomNavProps) {
  return (
    <nav className="bottom-nav flex items-center justify-around border-t border-slate-700/50 px-2 py-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        const isEmergency = item.id === 'emergency';

        return (
          <button
            key={item.id}
            onClick={() => {
              hapticFeedback('light');
              onNavigate(item.id);
            }}
            className={`
              flex flex-col items-center justify-center gap-0.5
              touch-target px-3 py-1.5 rounded-lg transition-all duration-200
              ${isActive
                ? 'text-medical-primary'
                : isEmergency
                  ? 'text-red-400'
                  : 'text-slate-500'
              }
            `}
          >
            <Icon
              size={20}
              className={isActive ? 'text-medical-primary' : ''}
            />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
