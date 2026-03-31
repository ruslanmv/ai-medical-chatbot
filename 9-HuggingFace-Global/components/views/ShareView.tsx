'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, ExternalLink, Code, QrCode } from 'lucide-react';
import type { SupportedLanguage } from '@/lib/i18n';
import ShareButtons from '../ui/ShareButtons';

interface ShareViewProps {
  language: SupportedLanguage;
}

const DEFAULT_URL = 'https://ruslanmv-medibot.hf.space';

export default function ShareView({ language }: ShareViewProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [appUrl, setAppUrl] = useState(DEFAULT_URL);

  useEffect(() => {
    setAppUrl(window.location.origin);
  }, []);

  const embedCode = `<iframe
  src="${appUrl}"
  width="100%"
  height="600"
  frameborder="0"
  allow="microphone"
  style="border-radius: 12px; border: 1px solid #334155;"
></iframe>`;

  const copyToClipboard = async (text: string, type: 'link' | 'embed') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        setCopiedEmbed(true);
        setTimeout(() => setCopiedEmbed(false), 2000);
      }
    } catch {
      // Fallback for older browsers
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scroll-smooth">
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-700/50">
        <h2 className="text-lg font-bold text-slate-100">Share MedOS</h2>
        <p className="text-sm text-slate-400 mt-1">
          Help others get free medical guidance
        </p>
      </div>

      <div className="p-4 space-y-6">
        {/* Share Buttons */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">
            Share via messaging
          </h3>
          <ShareButtons url={appUrl} language={language} />
        </div>

        {/* Copy Link */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">
            Copy link
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={appUrl}
              className="flex-1 bg-slate-800 border border-slate-700/50 rounded-lg px-3 py-2
                         text-sm text-slate-300"
            />
            <button
              onClick={() => copyToClipboard(appUrl, 'link')}
              className="touch-target rounded-lg p-2 bg-slate-700 text-slate-300
                         hover:bg-slate-600 transition-colors"
            >
              {copiedLink ? (
                <Check size={18} className="text-green-400" />
              ) : (
                <Copy size={18} />
              )}
            </button>
          </div>
        </div>

        {/* QR Code */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <QrCode size={16} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-300">
              QR Code for Print
            </h3>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Print this QR code for clinics, pharmacies, or community health centers.
          </p>
          <div className="bg-white rounded-xl p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="w-32 h-32 bg-slate-200 rounded-lg flex items-center justify-center mb-2">
                <QrCode size={64} className="text-slate-800" />
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Scan for free medical AI
              </p>
            </div>
          </div>
        </div>

        {/* Embed Code */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Code size={16} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-300">
              Embed on your website
            </h3>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Copy this code to embed MedOS on any website, blog, or health portal.
          </p>
          <div className="relative">
            <pre className="bg-slate-800 border border-slate-700/50 rounded-xl p-4
                           text-xs text-slate-300 overflow-x-auto">
              {embedCode}
            </pre>
            <button
              onClick={() => copyToClipboard(embedCode, 'embed')}
              className="absolute top-2 right-2 touch-target rounded-lg p-1.5
                         bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
            >
              {copiedEmbed ? (
                <Check size={14} className="text-green-400" />
              ) : (
                <Copy size={14} />
              )}
            </button>
          </div>
        </div>

        {/* Link to GitHub */}
        <div className="pt-4 border-t border-slate-700/30">
          <a
            href="https://github.com/ruslanmv/ai-medical-chatbot"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
          >
            <ExternalLink size={14} />
            View source on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
