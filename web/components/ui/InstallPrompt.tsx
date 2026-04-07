"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "medos_install_dismissed";
const DELAY_MS = 8000;

/**
 * PWA install prompt. Shows after a short delay on the first session.
 * Dismissed state persisted in localStorage. Skips if already installed.
 */
export function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    if (window.matchMedia?.("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setTimeout(() => setVisible(true), DELAY_MS);
    };
    window.addEventListener("beforeinstallprompt", handler as EventListener);
    return () => window.removeEventListener("beforeinstallprompt", handler as EventListener);
  }, []);

  const install = async () => {
    if (!evt) return;
    try {
      await evt.prompt();
      const choice = await evt.userChoice;
      if (choice.outcome === "accepted") localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setVisible(false);
    setEvt(null);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  if (!visible || !evt) return null;

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-16 md:bottom-4 z-50 w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-surface-1 border border-line/60 shadow-card backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-glow">
          <Download size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink-base">Install MedOS</p>
          <p className="text-xs text-ink-muted mt-0.5">Add to home screen for instant access. Free, private.</p>
          <div className="flex items-center gap-2 mt-3">
            <button onClick={install} className="px-3 py-1.5 rounded-lg bg-brand-gradient text-white text-xs font-bold hover:brightness-110">
              Install
            </button>
            <button onClick={dismiss} className="px-3 py-1.5 rounded-lg text-ink-muted text-xs font-semibold hover:text-ink-base">
              Not now
            </button>
          </div>
        </div>
        <button onClick={dismiss} aria-label="Dismiss" className="flex-shrink-0 text-ink-subtle hover:text-ink-base">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
