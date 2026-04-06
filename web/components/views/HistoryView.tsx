"use client";

import { Clock, MessageCircle, Trash2, XCircle } from "lucide-react";
import { type ConversationSummary } from "@/lib/health-store";
import { type SupportedLanguage } from "@/lib/i18n";

interface HistoryViewProps {
  history: ConversationSummary[];
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onReplay: (preview: string) => void;
  language: SupportedLanguage;
}

export function HistoryView({
  history,
  onDelete,
  onClearAll,
  onReplay,
}: HistoryViewProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8">
      <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-ink-base">
              {t("hist_title", language)}
            </h2>
            <p className="text-sm text-ink-muted mt-1">
              {t("hist_subtitle", language)}
            </p>
          </div>
          {history.length > 0 && (
            <button
              onClick={onClearAll}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-danger-500 bg-danger-500/10 border border-danger-500/30 rounded-xl hover:bg-danger-500/20 transition-colors"
            >
              <XCircle size={13} />
              Clear all
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-gradient-soft flex items-center justify-center">
              <Clock size={28} className="text-brand-500" />
            </div>
            <h3 className="font-bold text-ink-base text-lg mb-1">
              {t("hist_none", language)}
            </h3>
            <p className="text-ink-muted text-sm">
              {t("hist_none_desc", language)}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="bg-surface-1 border border-line/60 rounded-2xl p-4 shadow-soft group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-gradient-soft flex items-center justify-center flex-shrink-0">
                    <MessageCircle size={16} className="text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => onReplay(h.preview)}
                      className="text-left w-full"
                    >
                      <span className="font-bold text-sm text-ink-base block truncate hover:text-brand-600 transition-colors">
                        {h.preview}
                      </span>
                    </button>
                    <div className="flex items-center gap-3 mt-1 text-xs text-ink-muted">
                      <span>
                        {new Date(h.date).toLocaleDateString()}
                      </span>
                      <span>{h.messageCount} messages</span>
                      {h.topic && (
                        <span className="px-2 py-0.5 bg-surface-2 border border-line/60 rounded-full text-[10px] font-semibold">
                          {h.topic}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onDelete(h.id)}
                    className="text-ink-subtle hover:text-danger-500 p-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
