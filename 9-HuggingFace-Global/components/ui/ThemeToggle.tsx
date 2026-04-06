'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import type { ThemeMode } from '@/lib/hooks/useTheme';

interface ThemeToggleProps {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
}

const OPTIONS: { id: ThemeMode; Icon: typeof Sun }[] = [
  { id: 'light',  Icon: Sun },
  { id: 'dark',   Icon: Moon },
  { id: 'system', Icon: Monitor },
];

export default function ThemeToggle({ theme, setTheme }: ThemeToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex items-center gap-0.5 rounded-full p-0.5 bg-slate-200/70 dark:bg-slate-800/70 border border-slate-300/60 dark:border-slate-700/60"
    >
      {OPTIONS.map(({ id, Icon }) => {
        const active = theme === id;
        return (
          <button
            key={id}
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(id)}
            className={`flex items-center justify-center h-7 w-7 rounded-full transition-all ${
              active
                ? 'bg-white dark:bg-slate-700 text-medical-primary shadow-sm'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Icon size={14} strokeWidth={2.25} />
          </button>
        );
      })}
    </div>
  );
}
