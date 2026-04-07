"use client";

import { useState, useEffect } from "react";
import { Copy, Check, ExternalLink, Code, QrCode, Share2 } from "lucide-react";
import { type SupportedLanguage } from "@/lib/i18n";

interface ShareViewProps {
  language: SupportedLanguage;
}

export function ShareView({ language }: ShareViewProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [appUrl, setAppUrl] = useState("https://medos.health");

  useEffect(() => {
    setAppUrl(window.location.origin);
  }, []);

  const embedCode = `<iframe src="${appUrl}" width="100%" height="600" frameborder="0" allow="microphone" style="border-radius:12px;border:1px solid #e2e8f0;"></iframe>`;

  const copy = async (text: string, type: "link" | "embed") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "link") { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }
      else { setCopiedEmbed(true); setTimeout(() => setCopiedEmbed(false), 2000); }
    } catch {}
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "MedOS — Free AI Medical Assistant", text: "Get free AI medical advice in 20 languages:", url: appUrl });
      } catch {}
    }
  };

  const SHARE_MSG = encodeURIComponent(`Get free AI medical advice! MedOS — 20 languages, no sign-up: ${appUrl}`);
  const ENC_URL = encodeURIComponent(appUrl);

  const platforms = [
    { name: "WhatsApp", href: `https://wa.me/?text=${SHARE_MSG}`, color: "bg-green-600 hover:bg-green-500", label: "WA" },
    { name: "Telegram", href: `https://t.me/share/url?url=${ENC_URL}&text=${SHARE_MSG}`, color: "bg-blue-500 hover:bg-blue-400", label: "TG" },
    { name: "Twitter", href: `https://twitter.com/intent/tweet?text=${SHARE_MSG}`, color: "bg-ink-subtle hover:bg-ink-muted", label: "X" },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${ENC_URL}`, color: "bg-blue-700 hover:bg-blue-600", label: "FB" },
    { name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${ENC_URL}`, color: "bg-blue-800 hover:bg-blue-700", label: "LI" },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 pb-mobile-nav scroll-touch">
      <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-2xl font-bold text-ink-base mb-1">Share MedOS</h2>
        <p className="text-sm text-ink-muted mb-6">Help others get free medical guidance</p>

        {/* Native share (mobile) */}
        {"share" in (globalThis.navigator || {}) && (
          <button
            onClick={nativeShare}
            className="w-full py-3 mb-5 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 transition-all flex items-center justify-center gap-2"
          >
            <Share2 size={16} /> Share via...
          </button>
        )}

        {/* Platform buttons */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          {platforms.map((p) => (
            <a
              key={p.name}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl ${p.color} text-white transition-colors`}
            >
              <span className="text-sm font-bold">{p.label}</span>
              <span className="text-[9px] opacity-80">{p.name}</span>
            </a>
          ))}
        </div>

        {/* Copy link */}
        <Section title="Copy link">
          <div className="flex gap-2">
            <input
              readOnly
              value={appUrl}
              className="flex-1 bg-surface-2 border border-line/60 rounded-xl px-3 py-2.5 text-sm text-ink-base"
            />
            <button
              onClick={() => copy(appUrl, "link")}
              className="p-2.5 rounded-xl bg-surface-2 border border-line/60 text-ink-muted hover:text-brand-600 transition-colors"
            >
              {copiedLink ? <Check size={16} className="text-success-500" /> : <Copy size={16} />}
            </button>
          </div>
        </Section>

        {/* QR Code */}
        <Section title="QR Code for print" icon={QrCode}>
          <p className="text-xs text-ink-muted mb-3">
            Print this QR code for clinics, pharmacies, or community health centers.
          </p>
          <div className="bg-white dark:bg-white rounded-2xl p-6 flex items-center justify-center border border-line/40">
            <div className="text-center">
              <div className="w-32 h-32 bg-slate-100 rounded-lg flex items-center justify-center mb-2">
                <QrCode size={64} className="text-slate-800" />
              </div>
              <p className="text-xs text-slate-600 font-medium">Scan for free medical AI</p>
            </div>
          </div>
        </Section>

        {/* Embed code */}
        <Section title="Embed on your website" icon={Code}>
          <p className="text-xs text-ink-muted mb-3">
            Copy this code to embed MedOS on any website, blog, or health portal.
          </p>
          <div className="relative">
            <pre className="bg-surface-2 border border-line/60 rounded-xl p-4 text-xs text-ink-base overflow-x-auto">
              {embedCode}
            </pre>
            <button
              onClick={() => copy(embedCode, "embed")}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-surface-1 border border-line/60 text-ink-muted hover:text-brand-600 transition-colors"
            >
              {copiedEmbed ? <Check size={14} className="text-success-500" /> : <Copy size={14} />}
            </button>
          </div>
        </Section>

        {/* GitHub link */}
        <div className="pt-4 mt-4 border-t border-line/40">
          <a
            href="https://github.com/ruslanmv/ai-medical-chatbot"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-ink-muted hover:text-brand-600 transition-colors"
          >
            <ExternalLink size={14} /> View source on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon?: any; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon size={14} className="text-ink-subtle" />}
        <h3 className="text-sm font-semibold text-ink-base">{title}</h3>
      </div>
      {children}
    </div>
  );
}
