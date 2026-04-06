'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

/**
 * Custom PWA install prompt banner.
 *
 * - Captures the standard `beforeinstallprompt` event (Chromium/Edge/
 *   Samsung) and defers it so we can surface a friendlier custom banner.
 * - Shows AFTER a short delay so it doesn't interrupt the very first
 *   interaction — users install apps they already like.
 * - Dismissal is persisted in localStorage so we never nag.
 * - Re-appears automatically if the user uninstalls and comes back (the
 *   browser will fire `beforeinstallprompt` again).
 * - Gracefully absent on iOS Safari (which has no install event) — iOS
 *   users get an Add-to-Home-Screen hint via the manifest anyway.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'medos_install_dismissed';
const DELAY_MS = 8000;

export default function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(DISMISS_KEY) === '1') return;

    // Already installed? Nothing to do.
    if (window.matchMedia?.('(display-mode: standalone)').matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      // Delay the reveal so it never interrupts the first answer.
      setTimeout(() => setVisible(true), DELAY_MS);
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener);
    };
  }, []);

  const install = async () => {
    if (!evt) return;
    try {
      await evt.prompt();
      const choice = await evt.userChoice;
      if (choice.outcome === 'accepted') {
        localStorage.setItem(DISMISS_KEY, '1');
      }
    } catch {
      // User cancelled or unsupported — just hide the banner.
    } finally {
      setVisible(false);
      setEvt(null);
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
    setEvt(null);
  };

  if (!visible || !evt) return null;

  return (
    <div
      role="dialog"
      aria-label="Install MedOS on your device"
      className="fixed left-1/2 -translate-x-1/2 bottom-4 z-50 w-[calc(100%-2rem)] max-w-sm
                 rounded-2xl border border-slate-700/60 bg-slate-900/95 backdrop-blur-xl
                 shadow-2xl shadow-blue-500/10 animate-fade-in"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Download size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-100">
            Install MedOS on your phone
          </p>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            Add to your home screen for instant access. Free, private, offline-ready.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={install}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-teal-500 text-white text-xs font-bold hover:brightness-110 transition-all"
            >
              Install
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
