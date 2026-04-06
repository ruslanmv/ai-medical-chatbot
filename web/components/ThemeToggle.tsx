"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type ThemeMode } from "./ThemeProvider";

const OPTIONS: { id: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { id: "light",  label: "Light",  Icon: Sun },
  { id: "dark",   label: "Dark",   Icon: Moon },
  { id: "system", label: "Auto",   Icon: Monitor },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex items-center gap-0.5 rounded-full p-0.5 bg-surface-2/70 border border-line/60 backdrop-blur"
    >
      {OPTIONS.map(({ id, label, Icon }) => {
        const active = theme === id;
        return (
          <button
            key={id}
            role="radio"
            aria-checked={active}
            title={label}
            onClick={() => setTheme(id)}
            className={`flex items-center justify-center h-7 w-7 rounded-full transition-all ${
              active
                ? "bg-surface-1 text-brand-600 shadow-soft"
                : "text-ink-muted hover:text-ink-base"
            }`}
          >
            <Icon size={14} strokeWidth={2.25} />
          </button>
        );
      })}
    </div>
  );
}
