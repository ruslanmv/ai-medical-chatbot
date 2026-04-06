"use client";

import { useState } from "react";
import {
  Bell,
  X,
  Pill,
  Calendar,
  AlertCircle,
  Info,
  CheckCheck,
} from "lucide-react";
import type { Notification } from "@/lib/hooks/useNotifications";

interface NotificationCenterProps {
  notifications: Notification[];
  count: number;
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
}

/**
 * Notification bell + dropdown panel.
 *
 * Shows a badge with the active notification count. Clicking the bell
 * opens a dropdown listing overdue medications, upcoming appointments,
 * and health reminders. Each notification can be dismissed individually
 * or all at once.
 *
 * Desktop: dropdown positioned below the bell.
 * Mobile: also a dropdown (could be upgraded to a sheet later).
 */
export function NotificationBell({
  notifications,
  count,
  onDismiss,
  onDismissAll,
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-ink-muted hover:text-ink-base hover:bg-surface-2 transition-colors"
        aria-label={`Notifications (${count})`}
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-danger-500 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-sm animate-pulse">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          {/* Backdrop — closes on click */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          <div className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-surface-1 border border-line/60 rounded-2xl shadow-card z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-line/40">
              <h3 className="font-bold text-sm text-ink-base">Notifications</h3>
              <div className="flex items-center gap-2">
                {count > 0 && (
                  <button
                    onClick={onDismissAll}
                    className="text-[10px] font-semibold text-brand-500 hover:text-brand-600 flex items-center gap-1"
                  >
                    <CheckCheck size={12} />
                    Dismiss all
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="text-ink-subtle hover:text-ink-base p-0.5"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div className="overflow-y-auto max-h-72">
              {notifications.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <Bell size={24} className="mx-auto text-ink-subtle mb-2" />
                  <p className="text-sm text-ink-muted">All caught up!</p>
                  <p className="text-xs text-ink-subtle mt-0.5">
                    No pending reminders right now
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-line/30 last:border-0 ${
                      n.urgent
                        ? "bg-danger-500/5"
                        : "hover:bg-surface-2/50"
                    }`}
                  >
                    <NotificationIcon type={n.type} urgent={n.urgent} />
                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-sm font-semibold block ${
                          n.urgent ? "text-danger-600 dark:text-danger-400" : "text-ink-base"
                        }`}
                      >
                        {n.title}
                      </span>
                      <span className="text-xs text-ink-muted block mt-0.5">
                        {n.message}
                      </span>
                    </div>
                    <button
                      onClick={() => onDismiss(n.id)}
                      className="flex-shrink-0 p-1 text-ink-subtle hover:text-ink-base rounded"
                      title="Dismiss"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NotificationIcon({
  type,
  urgent,
}: {
  type: Notification["type"];
  urgent: boolean;
}) {
  const iconMap = {
    medication: Pill,
    appointment: Calendar,
    reminder: AlertCircle,
    info: Info,
  };
  const Icon = iconMap[type] || Info;
  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        urgent
          ? "bg-danger-500/15 text-danger-500"
          : type === "medication"
          ? "bg-rose-500/15 text-rose-500"
          : type === "appointment"
          ? "bg-purple-500/15 text-purple-500"
          : "bg-brand-500/15 text-brand-500"
      }`}
    >
      <Icon size={14} />
    </div>
  );
}
