"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

/**
 * Shows a banner when the browser goes offline.
 * Automatically hides when connectivity is restored.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    setOffline(!navigator.onLine);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-warning-500/15 border-b border-warning-500/30 text-warning-600 dark:text-warning-500">
      <WifiOff size={14} />
      <p className="text-xs font-medium">
        You&apos;re offline. Some features may be limited.
      </p>
    </div>
  );
}
