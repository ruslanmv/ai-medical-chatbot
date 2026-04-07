"use client";

import { useState } from "react";
import {
  X,
  Heart,
  Shield,
  Globe2,
  Clock4,
  ExternalLink,
  Github,
} from "lucide-react";

export function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface-1 border border-line/60 rounded-2xl shadow-card overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-line/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center text-white shadow-glow">
              <Heart size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="font-bold text-lg text-ink-base">MedOS</h2>
              <p className="text-xs text-ink-muted">v1.0.0</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-subtle hover:text-ink-base hover:bg-surface-2"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Description */}
          <p className="text-sm text-ink-base leading-relaxed">
            MedOS is a free, open-source AI medical assistant that speaks
            20 languages. It provides general health guidance aligned with
            WHO, CDC, and NHS guidelines — always available, completely
            private, no sign-up required.
          </p>

          {/* Key features */}
          <div className="grid grid-cols-3 gap-3">
            <FeatureChip icon={Shield} label="Private" detail="Zero data retention" />
            <FeatureChip icon={Globe2} label="20 languages" detail="Auto-detected" />
            <FeatureChip icon={Clock4} label="24/7" detail="Always available" />
          </div>

          {/* Tech stack */}
          <div className="bg-surface-2/50 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
              Powered by
            </h3>
            <div className="space-y-1.5 text-sm text-ink-base">
              <InfoRow label="AI Model" value="Llama 3.3 70B (via Groq)" />
              <InfoRow label="Knowledge" value="WHO · CDC · NHS · SIE · SID · ADA" />
              <InfoRow label="Framework" value="Next.js 14 · React 18" />
              <InfoRow label="Backend" value="HuggingFace Spaces · SQLite" />
              <InfoRow label="License" value="Apache 2.0 — Open Source" />
            </div>
          </div>

          {/* Links */}
          <div className="flex gap-2">
            <a
              href="https://github.com/ruslanmv/ai-medical-chatbot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-line/60 text-sm font-semibold text-ink-base hover:bg-surface-2 transition-colors"
            >
              <Github size={16} />
              GitHub
            </a>
            <a
              href="https://huggingface.co/spaces/ruslanmv/MediBot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-line/60 text-sm font-semibold text-ink-base hover:bg-surface-2 transition-colors"
            >
              <ExternalLink size={16} />
              HuggingFace
            </a>
          </div>

          {/* Disclaimer */}
          <p className="text-[10px] text-ink-subtle leading-relaxed text-center">
            MedOS provides general health information only. It is NOT a
            substitute for professional medical advice, diagnosis, or
            treatment. Always consult a qualified healthcare provider.
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureChip({
  icon: Icon,
  label,
  detail,
}: {
  icon: any;
  label: string;
  detail: string;
}) {
  return (
    <div className="text-center p-3 rounded-xl bg-surface-2/50 border border-line/40">
      <Icon size={18} className="mx-auto text-accent-500 mb-1.5" />
      <p className="text-xs font-bold text-ink-base">{label}</p>
      <p className="text-[10px] text-ink-subtle">{detail}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs font-semibold text-ink-subtle w-20 flex-shrink-0">
        {label}
      </span>
      <span className="text-xs text-ink-base">{value}</span>
    </div>
  );
}
