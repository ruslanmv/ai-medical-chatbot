"use client";

import { useState } from "react";
import { Copy, Check, FileText, Printer, Share2 } from "lucide-react";
import type { DoctorSummaryCard as DoctorSummaryCardData } from "@/lib/medical-flow/types";

/**
 * DoctorSummaryCard — the take-to-appointment artifact.
 *
 * This is the killer enterprise feature: a clinician-formatted summary
 * the user can copy, share, or print. Generic chatbots give you a wall
 * of text; MedOS gives you something you can hand to a doctor.
 *
 * Format mirrors a SOAP-lite chart entry:
 *   Chief complaint · Duration · Severity · Red flags checked /
 *   present · Current guidance · Seek-care criteria
 *
 * Copy-to-clipboard uses plain text (markdown-friendly) so it pastes
 * cleanly into any EMR, email, or note app.
 */

function buildPlaintext(card: DoctorSummaryCardData): string {
  const lines: string[] = [];
  lines.push(`MedOS Symptom Summary`);
  lines.push(`Generated: ${new Date(card.generated_at).toLocaleString()}`);
  lines.push('');
  lines.push(`Chief complaint: ${card.chief_complaint}`);
  lines.push(`Duration: ${card.duration}`);
  if (card.severity !== undefined) {
    lines.push(`Severity: ${card.severity}/10`);
  }
  lines.push('');
  lines.push(`Red flags checked: ${card.red_flags_checked.join(', ') || 'none'}`);
  lines.push(
    `Warning signs present: ${
      card.warning_signs_present.length > 0
        ? card.warning_signs_present.join(', ')
        : 'none reported'
    }`,
  );
  lines.push('');
  lines.push(`Current guidance: ${card.current_guidance}`);
  if (card.seek_care_if.length > 0) {
    lines.push('');
    lines.push('Seek care if:');
    for (const s of card.seek_care_if) lines.push(`  • ${s}`);
  }
  lines.push('');
  lines.push(
    'Note: MedOS provides general guidance and does not diagnose. Please confirm with a licensed clinician.',
  );
  return lines.join('\n');
}

export function DoctorSummaryCard({ card }: { card: DoctorSummaryCardData }) {
  const [copied, setCopied] = useState(false);
  const text = buildPlaintext(card);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable (older browser / non-https) — fall
      // back to a hidden textarea + execCommand path.
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  const share = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: 'MedOS Symptom Summary',
          text,
        });
      } catch {
        // Share cancelled or unsupported — silent fallback to copy.
        copy();
      }
    } else {
      copy();
    }
  };

  const print = () => {
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) return;
    w.document.write(`
      <!doctype html><html><head><title>MedOS Symptom Summary</title>
      <style>
        body { font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 0 20px; line-height: 1.5; color: #1e293b; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .meta { color: #64748b; font-size: 12px; margin-bottom: 24px; }
        pre { white-space: pre-wrap; font-family: inherit; font-size: 14px; }
      </style></head><body>
        <h1>MedOS Symptom Summary</h1>
        <div class="meta">Generated: ${new Date(card.generated_at).toLocaleString()}</div>
        <pre>${text.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))}</pre>
      </body></html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="rounded-2xl border border-line/60 bg-surface-1 shadow-soft overflow-hidden animate-fade-up">
      <div className="px-4 py-3 sm:px-5 sm:py-4 flex items-center gap-3 border-b border-line/40 bg-surface-2">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-brand-gradient flex items-center justify-center text-white">
          <FileText size={18} strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-ink-base text-[15px] tracking-tight">
            Doctor summary
          </h3>
          <p className="text-[11px] text-ink-subtle">
            Generated {new Date(card.generated_at).toLocaleTimeString()} · share with your clinician
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-3">
        <Row label="Chief complaint" value={card.chief_complaint} />
        <Row label="Duration" value={card.duration} />
        {card.severity !== undefined && (
          <Row label="Severity" value={`${card.severity}/10`} />
        )}
        <Row
          label="Red flags checked"
          value={card.red_flags_checked.join(', ') || '—'}
        />
        <Row
          label="Warning signs present"
          value={
            card.warning_signs_present.length > 0
              ? card.warning_signs_present.join(', ')
              : 'none reported'
          }
          alert={card.warning_signs_present.length > 0}
        />
        <Row label="Current guidance" value={card.current_guidance} bold />
        {card.seek_care_if.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-subtle mb-1">
              Seek care if
            </div>
            <ul className="space-y-1">
              {card.seek_care_if.map((s, i) => (
                <li key={i} className="text-sm text-ink-base flex items-start gap-2">
                  <span className="text-warning-500 flex-shrink-0">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-[11px] text-ink-subtle italic pt-2 border-t border-line/30">
          MedOS provides general guidance and does not diagnose. Please confirm with a licensed clinician.
        </p>
      </div>

      <div className="px-4 sm:px-5 py-3 border-t border-line/30 flex flex-wrap gap-2">
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold bg-brand-gradient text-white shadow-soft hover:brightness-110 transition-all"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          onClick={share}
          className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold border border-line/60 bg-surface-2 text-ink-base hover:bg-surface-3 transition-all"
        >
          <Share2 size={14} />
          Share
        </button>
        <button
          onClick={print}
          className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold border border-line/60 bg-surface-2 text-ink-base hover:bg-surface-3 transition-all"
        >
          <Printer size={14} />
          Print
        </button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  alert,
  bold,
}: {
  label: string;
  value: string;
  alert?: boolean;
  bold?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-subtle">
        {label}
      </div>
      <div
        className={
          'text-sm leading-snug ' +
          (alert ? 'text-warning-700 font-semibold' : bold ? 'text-ink-base font-semibold' : 'text-ink-base')
        }
      >
        {value}
      </div>
    </div>
  );
}
