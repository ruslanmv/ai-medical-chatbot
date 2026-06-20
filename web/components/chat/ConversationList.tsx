"use client";

import { MessageSquare, Trash2 } from "lucide-react";
import type { ConversationSummary } from "@/lib/health-store";

interface ConversationListProps {
  conversations: ConversationSummary[];
  activeId?: string | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  /** Desktop collapsed sidebar — hide the list (it needs width). */
  collapsed?: boolean;
  /** Section label (e.g. "Recent"). */
  label?: string;
  /** Max items to show. */
  limit?: number;
}

/**
 * Inline recent-conversations list — the ChatGPT / Claude pattern: your past
 * chats live in the sidebar under New Chat; tap one to RESUME the full thread
 * in place. Only conversations with a stored thread are shown (older summary-
 * only entries from before full-thread persistence are skipped). The delete
 * affordance stays lightly visible so it works on touch as well as hover.
 */
export function ConversationList({
  conversations,
  activeId,
  onOpen,
  onDelete,
  collapsed = false,
  label = "Recent",
  limit = 25,
}: ConversationListProps) {
  if (collapsed) return null;

  const items = conversations
    .filter((c) => c.messages && c.messages.length > 0)
    .slice(0, limit);
  if (items.length === 0) return null;

  return (
    <div className="mt-1">
      <div className="mt-3 mb-1 px-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-subtle">
          {label}
        </span>
      </div>
      <div className="space-y-0.5">
        {items.map((c) => {
          const active = c.id === activeId;
          const title = (c.title || c.preview || "New conversation").trim();
          return (
            <div
              key={c.id}
              className={`group relative flex items-center rounded-lg transition-colors ${
                active ? "bg-brand-500/10" : "hover:bg-surface-2"
              }`}
            >
              <button
                onClick={() => onOpen(c.id)}
                title={title}
                className={`flex-1 min-w-0 flex items-center gap-2.5 px-3 py-2 text-left text-sm ${
                  active ? "text-brand-600 font-medium" : "text-ink-base"
                }`}
              >
                <MessageSquare
                  size={15}
                  className={`flex-shrink-0 ${active ? "text-brand-500" : "text-ink-subtle"}`}
                />
                <span className="truncate">{title}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(c.id);
                }}
                aria-label="Delete conversation"
                className="flex-shrink-0 p-1.5 mr-1 rounded-md text-ink-subtle/60 hover:text-danger-500 hover:bg-danger-500/10 active:scale-95 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
