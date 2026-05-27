"use client";

import { useState, useEffect, useRef } from "react";
import {
  Copy,
  Check,
  ExternalLink,
  Code,
  QrCode,
  Share2,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { type SupportedLanguage } from "@/lib/i18n";

interface ShareViewProps {
  language: SupportedLanguage;
}

/**
 * ShareView — distribution surface for MedOS.
 *
 * Hierarchy is deliberate so the page reads as a healthcare utility,
 * not a marketing dashboard:
 *
 *   1. "Share via…" — primary action. Opens a compact modal with the
 *      five social targets (WA / TG / X / FB / LI) as icon-buttons,
 *      not five big colored cards on the page.
 *   2. Copy link — single row with the canonical URL + copy affordance.
 *   3. QR code — small card; print-friendly.
 *   4. Embed on your website — collapsed accordion. Lives at the bottom
 *      because the iframe snippet is for site operators, not end users.
 */
export function ShareView({ language }: ShareViewProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [appUrl, setAppUrl] = useState("https://medos.health");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);

  useEffect(() => {
    setAppUrl(window.location.origin);
  }, []);

  const embedCode = `<iframe src="${appUrl}" width="100%" height="600" frameborder="0" allow="microphone" style="border-radius:12px;border:1px solid #e2e8f0;"></iframe>`;

  const copy = async (text: string, type: "link" | "embed") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "link") {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        setCopiedEmbed(true);
        setTimeout(() => setCopiedEmbed(false), 2000);
      }
    } catch {
      // Clipboard API unavailable (older browser / non-https) — silent
      // fail; the user can still long-press the textarea to copy.
    }
  };

  const SHARE_MSG = encodeURIComponent(
    `Get free AI medical advice! MedOS — 20 languages, no sign-up: ${appUrl}`,
  );
  const ENC_URL = encodeURIComponent(appUrl);

  const shareTargets = [
    {
      label: "WhatsApp",
      short: "WA",
      href: `https://wa.me/?text=${SHARE_MSG}`,
    },
    {
      label: "Telegram",
      short: "TG",
      href: `https://t.me/share/url?url=${ENC_URL}&text=${SHARE_MSG}`,
    },
    {
      label: "X",
      short: "X",
      href: `https://twitter.com/intent/tweet?text=${SHARE_MSG}&url=${ENC_URL}`,
    },
    {
      label: "Facebook",
      short: "FB",
      href: `https://www.facebook.com/sharer/sharer.php?u=${ENC_URL}`,
    },
    {
      label: "LinkedIn",
      short: "LI",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${ENC_URL}`,
    },
  ];

  const openShare = async () => {
    // Native share sheet first (mobile + supporting browsers). Falls back
    // to the in-app modal so the user still gets a way to share on
    // desktop / non-Web-Share browsers.
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: "MedOS — Free AI Medical Assistant",
          text: "Get free AI medical advice in 20 languages:",
          url: appUrl,
        });
        return;
      } catch {
        // User cancelled, or share failed — fall through to the modal.
      }
    }
    setShareModalOpen(true);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 pb-mobile-nav scroll-touch">
      <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-2xl font-bold text-ink-base mb-1">Share MedOS</h2>
        <p className="text-sm text-ink-muted mb-6">
          Help others get free medical guidance — works in any browser, no sign-up.
        </p>

        {/* Primary action — single big button. Opens native share on
         * mobile, falls back to the in-app modal of social icons. */}
        <button
          onClick={openShare}
          className="w-full py-4 rounded-2xl bg-brand-gradient text-white font-bold shadow-soft hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
        >
          <Share2 size={18} /> Share via…
        </button>

        {/* Copy link — single row. */}
        <Section title="Copy link" className="mt-7">
          <div className="flex gap-2">
            <input
              readOnly
              value={appUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 bg-surface-2 border border-line/60 rounded-xl px-3 py-2.5 text-sm text-ink-base focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
            <button
              onClick={() => copy(appUrl, "link")}
              className="p-2.5 rounded-xl bg-surface-2 border border-line/60 text-ink-muted hover:text-brand-600 hover:bg-surface-3 transition-colors"
              aria-label="Copy link"
            >
              {copiedLink ? (
                <Check size={16} className="text-success-500" />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>
        </Section>

        {/* QR code — for print. Small, single column. */}
        <Section title="QR code for print" icon={QrCode}>
          <p className="text-xs text-ink-muted mb-3">
            Print this QR code for clinics, pharmacies, or community health centers.
          </p>
          <QRCode value={appUrl} />
        </Section>

        {/* Embed — collapsed accordion. Operator-only territory, hidden
         * until requested so it doesn't compete with the primary actions. */}
        <div className="mt-6 border border-line/60 rounded-2xl bg-surface-1 overflow-hidden">
          <button
            onClick={() => setEmbedOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-surface-2 transition-colors"
            aria-expanded={embedOpen}
          >
            <span className="flex items-center gap-2">
              <Code size={14} className="text-ink-subtle" />
              <span className="text-sm font-semibold text-ink-base">
                Embed on your website
              </span>
            </span>
            {embedOpen ? (
              <ChevronUp size={16} className="text-ink-subtle" />
            ) : (
              <ChevronDown size={16} className="text-ink-subtle" />
            )}
          </button>
          {embedOpen && (
            <div className="px-4 pb-4 border-t border-line/40 animate-in fade-in slide-in-from-top-1 duration-200">
              <p className="text-xs text-ink-muted my-3">
                Copy this code to embed MedOS on any website, blog, or health portal.
              </p>
              <div className="relative">
                <pre className="bg-surface-2 border border-line/60 rounded-xl p-4 text-xs text-ink-base overflow-x-auto whitespace-pre-wrap break-all">
                  {embedCode}
                </pre>
                <button
                  onClick={() => copy(embedCode, "embed")}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-surface-1 border border-line/60 text-ink-muted hover:text-brand-600 transition-colors"
                  aria-label="Copy embed code"
                >
                  {copiedEmbed ? (
                    <Check size={14} className="text-success-500" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* GitHub footer — quiet text link, not a button. */}
        <div className="pt-4 mt-6 border-t border-line/40">
          <a
            href="https://github.com/ruslanmv/ai-medical-chatbot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-brand-600 transition-colors"
          >
            <ExternalLink size={14} /> View source on GitHub
          </a>
        </div>
      </div>

      {/* Share modal — compact, 5-icon grid. */}
      {shareModalOpen && (
        <ShareModal
          targets={shareTargets}
          onClose={() => setShareModalOpen(false)}
        />
      )}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  className,
  children,
}: {
  title: string;
  icon?: any;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={"mb-6 " + (className || "")}>
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon size={14} className="text-ink-subtle" />}
        <h3 className="text-sm font-semibold text-ink-base">{title}</h3>
      </div>
      {children}
    </div>
  );
}

/**
 * ShareModal — compact social-target picker.
 *
 * Used only when the platform doesn't support Web Share (desktop, older
 * browsers). Renders the five targets as small icon buttons in a single
 * row, with a backdrop + ESC + outside-click to close.
 */
function ShareModal({
  targets,
  onClose,
}: {
  targets: { label: string; short: string; href: string }[];
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // ESC to close.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-3xl border border-line/60 bg-surface-1 p-5 shadow-card animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="share-modal-title"
              className="text-lg font-bold text-ink-base"
            >
              Share MedOS
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Choose where to share this free medical assistant.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-ink-muted hover:bg-surface-2 hover:text-ink-base transition-colors"
            aria-label="Close share options"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-5 gap-3">
          {targets.map((target) => (
            <a
              key={target.label}
              href={target.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-line/60 bg-surface-2 p-3 hover:bg-surface-3 active:scale-[0.97] transition-all"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-1 text-sm font-black text-ink-base">
                {target.short}
              </span>
              <span className="text-[11px] font-semibold text-ink-muted group-hover:text-ink-base">
                {target.label}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * QRCode — renders a scannable QR for the given URL via the third-party
 * qrserver.com image API. Kept dependency-free on purpose: pulling
 * `qrcode.react` would add ~20KB to the bundle for a feature that's
 * used twice a week, and the image API is the same one widely used
 * across health-portal embeds.
 */
function QRCode({ value }: { value: string }) {
  const size = 160;
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    value,
  )}&margin=10`;
  return (
    <div className="bg-white dark:bg-white rounded-2xl p-5 flex items-center justify-center border border-line/40">
      <div className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`QR code linking to ${value}`}
          width={size}
          height={size}
          className="mx-auto"
          loading="lazy"
        />
        <p className="mt-2 text-xs text-slate-600 font-medium">
          Scan for free medical AI
        </p>
      </div>
    </div>
  );
}
