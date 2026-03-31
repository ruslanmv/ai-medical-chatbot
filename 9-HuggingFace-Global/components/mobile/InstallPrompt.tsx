'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { canInstallPWA, installPWA, isPWAInstalled } from '@/lib/mobile/pwa';

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (isPWAInstalled()) return;

    const handleInstallable = () => setShowPrompt(true);
    window.addEventListener('pwa-installable', handleInstallable);

    // Check if already installable
    if (canInstallPWA()) setShowPrompt(true);

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
    };
  }, []);

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-medical-primary/20 flex items-center justify-center flex-shrink-0">
            <Download size={20} className="text-medical-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-200">
              Install MedOS
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Add to your home screen for quick access, offline support, and a
              native app experience.
            </p>
          </div>
          <button
            onClick={() => setShowPrompt(false)}
            className="touch-target p-1 text-slate-500 hover:text-slate-300"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setShowPrompt(false)}
            className="flex-1 py-2 rounded-lg text-sm text-slate-400
                       hover:text-slate-300 transition-colors"
          >
            Not now
          </button>
          <button
            onClick={async () => {
              await installPWA();
              setShowPrompt(false);
            }}
            className="flex-1 py-2 rounded-lg bg-medical-primary text-white text-sm
                       font-semibold hover:bg-blue-500 transition-colors"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
