"use client";

import { useState } from "react";
import {
  Globe,
  Volume2,
  Type,
  Moon,
  Phone,
  Shield,
  ChevronDown,
  ChevronRight,
  Cpu,
  Key,
  Activity,
  AlertTriangle,
  Eye,
  EyeOff,
  Mic,
  BookOpen,
  Sparkles,
  Zap,
  Brain,
  Server,
  ExternalLink,
} from "lucide-react";
import { Toggle } from "../chat/Toggle";
import type { Provider, Preset } from "@/lib/types";
import { PROVIDER_CONFIGS } from "@/lib/types";
import {
  t,
  LANGUAGE_NAMES,
  getCountryName,
  type SupportedLanguage,
} from "@/lib/i18n";
import type { TextSize } from "@/lib/hooks/useSettings";

interface SettingsViewProps {
  preset: Preset;
  setPreset: (p: Preset) => void;
  hfToken: string;
  setHfToken: (v: string) => void;
  clearHfToken: () => void;
  provider: Provider;
  setProvider: (provider: Provider) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
  advancedMode: boolean;
  setAdvancedMode: (v: boolean) => void;
  language: SupportedLanguage;
  setLanguage: (v: SupportedLanguage) => void;
  country: string;
  setCountry: (v: string) => void;
  voiceEnabled: boolean;
  setVoiceEnabled: (v: boolean) => void;
  readAloud: boolean;
  setReadAloud: (v: boolean) => void;
  textSize: TextSize;
  setTextSize: (v: TextSize) => void;
  simpleLanguage: boolean;
  setSimpleLanguage: (v: boolean) => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  emergencyNumber: string;
}

const COUNTRIES = [
  "US", "CA", "GB", "AU", "NZ", "IT", "DE", "FR", "ES", "PT", "NL", "PL",
  "IN", "CN", "JP", "KR", "BR", "MX", "AR", "CO", "ZA", "NG", "KE", "TZ",
  "EG", "MA", "TR", "RU", "SA", "AE", "PK", "BD", "VN", "TH", "PH", "ID", "MY",
];

export function SettingsView({
  preset,
  setPreset,
  hfToken,
  setHfToken,
  clearHfToken,
  provider,
  setProvider,
  apiKey,
  setApiKey,
  clearApiKey,
  advancedMode,
  setAdvancedMode,
  language,
  setLanguage,
  country,
  setCountry,
  voiceEnabled,
  setVoiceEnabled,
  readAloud,
  setReadAloud,
  textSize,
  setTextSize,
  simpleLanguage,
  setSimpleLanguage,
  darkMode,
  setDarkMode,
  emergencyNumber,
}: SettingsViewProps) {
  const [showMoreModels, setShowMoreModels] = useState(false);
  const [showBYOKey, setShowBYOKey] = useState(advancedMode);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<{
    success?: boolean;
    message?: string;
  }>({});

  const isRecommended = preset === "free-best" || preset === "free-fastest" || preset === "free-flexible";

  const handleVerifyConnection = async () => {
    if (!apiKey.trim()) {
      setVerifyStatus({ success: false, message: "Please enter an API key first" });
      return;
    }
    setIsVerifying(true);
    setVerifyStatus({});
    try {
      const response = await fetch("/api/proxy/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, userHfToken: hfToken }),
      });
      const data = await response.json();
      setVerifyStatus({
        success: data.success,
        message: data.success ? "Connection verified!" : data.error || "Connection failed",
      });
    } catch (error: any) {
      setVerifyStatus({ success: false, message: error?.message || "Network error" });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 pb-mobile-nav scroll-touch">
      <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-2xl font-bold text-ink-base mb-6">
          {t("settings_title", language)}
        </h2>

        {/* ============================================ */}
        {/* AI MODEL — simplified, single recommended    */}
        {/* ============================================ */}
        <SettingsSection icon={Cpu} title="AI Model">
          {/* Recommended (default) */}
          <button
            onClick={() => { setPreset("free-best"); setShowBYOKey(false); setAdvancedMode(false); }}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
              isRecommended && !showBYOKey
                ? "bg-brand-500/5 border-brand-500"
                : "bg-surface-0 border-line/60 hover:border-brand-500/40"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-brand-500" />
                <span className={`font-semibold text-sm ${isRecommended && !showBYOKey ? "text-brand-600" : "text-ink-base"}`}>
                  Recommended (Free)
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success-500/10 text-success-600">
                AUTO
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-1.5">
              Llama 3.3 70B with smart fallbacks — best quality, always available
            </p>
          </button>

          {/* More options toggle */}
          <button
            onClick={() => setShowMoreModels(!showMoreModels)}
            className="w-full flex items-center gap-2 px-1 py-2.5 text-sm text-ink-muted hover:text-ink-base transition-colors"
          >
            <ChevronRight size={14} className={`transition-transform ${showMoreModels ? "rotate-90" : ""}`} />
            <span className="font-medium">More options</span>
          </button>

          {showMoreModels && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <ModelOption
                icon={Brain}
                title="Deep Reasoning"
                description="DeepSeek R1 — complex medical reasoning"
                badge="FREE"
                active={preset === "deep-reasoning" && !showBYOKey}
                onClick={() => { setPreset("deep-reasoning"); setShowBYOKey(false); setAdvancedMode(false); }}
              />
              <ModelOption
                icon={Server}
                title="Local (Ollama)"
                description="Runs on server — works offline, always available"
                badge="LOCAL"
                active={preset === "local" && !showBYOKey}
                onClick={() => { setPreset("local"); setShowBYOKey(false); setAdvancedMode(false); }}
              />
              <ModelOption
                icon={Key}
                title="Bring your own key"
                description="Use OpenAI, Gemini, Claude, or custom provider"
                badge="BYO"
                active={showBYOKey}
                onClick={() => { setShowBYOKey(true); setAdvancedMode(true); }}
              />
            </div>
          )}

          {/* BYO Key panel */}
          {showBYOKey && (
            <div className="mt-3 p-4 bg-surface-0 border border-line/60 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-start gap-2 p-2.5 bg-warning-500/5 border border-warning-500/20 rounded-lg">
                <AlertTriangle size={14} className="text-warning-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-warning-600">{t("settings_advanced_warning", language)}</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Provider</label>
                  <div className="relative">
                    <select
                      value={provider}
                      onChange={(e) => { setProvider(e.target.value as Provider); setVerifyStatus({}); }}
                      className="w-full appearance-none bg-surface-1 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium text-sm"
                    >
                      {Object.entries(PROVIDER_CONFIGS).map(([key, config]) => (
                        <option key={key} value={key}>{config.displayName}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" size={14} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    {provider === "ollama" ? t("settings_custom_server", language) : t("settings_api_key", language)}
                  </label>
                  <div className="relative">
                    <input
                      type={provider === "ollama" ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => { setApiKey(e.target.value); setVerifyStatus({}); }}
                      placeholder={provider === "ollama" ? "http://localhost:11434" : "sk-..."}
                      className="w-full bg-surface-1 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 pl-9 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-mono text-sm"
                    />
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" size={14} />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      verifyStatus.success === true ? "bg-success-500"
                        : verifyStatus.success === false ? "bg-danger-500"
                        : "bg-ink-subtle"
                    }`} />
                    <span className="text-[11px] text-ink-muted font-medium">
                      {verifyStatus.message || "Not verified"}
                    </span>
                  </div>
                  <button
                    onClick={handleVerifyConnection}
                    disabled={isVerifying || !apiKey.trim()}
                    className="text-xs font-bold text-brand-500 bg-brand-500/10 px-3 py-1.5 rounded-lg hover:bg-brand-500/20 transition-colors border border-brand-500/20 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Activity size={12} />
                    {isVerifying ? "Verifying..." : t("settings_verify", language)}
                  </button>
                </div>

                {apiKey && (
                  <button onClick={clearApiKey} className="text-xs text-danger-500 hover:underline">
                    {t("settings_clear_key", language)}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* HF Token (collapsed by default) */}
          <details className="mt-2">
            <summary className="flex items-center gap-2 px-1 py-2 text-xs text-ink-muted hover:text-ink-base cursor-pointer transition-colors">
              <Key size={12} />
              <span>HuggingFace token (optional — for higher rate limits)</span>
            </summary>
            <div className="mt-2 p-3 bg-surface-0 border border-line/60 rounded-xl">
              <div className="relative">
                <input
                  type="password"
                  value={hfToken}
                  onChange={(e) => setHfToken(e.target.value)}
                  placeholder="hf_..."
                  className="w-full bg-surface-1 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 pl-9 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-mono text-sm"
                />
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" size={14} />
              </div>
              {hfToken && (
                <button onClick={clearHfToken} className="text-xs text-danger-500 hover:underline mt-2">
                  Clear token
                </button>
              )}
            </div>
          </details>
        </SettingsSection>

        {/* ============================================ */}
        {/* LANGUAGE & REGION                            */}
        {/* ============================================ */}
        <SettingsSection icon={Globe} title={t("settings_language", language)}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                {t("settings_language", language)}
              </label>
              <div className="relative">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                  className="w-full appearance-none bg-surface-0 border border-line/60 text-ink-base rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium text-base"
                >
                  {(Object.entries(LANGUAGE_NAMES) as [SupportedLanguage, string][]).map(
                    ([code, name]) => (
                      <option key={code} value={code}>{name}</option>
                    )
                  )}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" size={16} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                {t("settings_country", language)}
              </label>
              <div className="relative">
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full appearance-none bg-surface-0 border border-line/60 text-ink-base rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium text-base"
                >
                  {COUNTRIES.map((code) => (
                    <option key={code} value={code}>{getCountryName(code)}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" size={16} />
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* ============================================ */}
        {/* VOICE & ACCESSIBILITY                        */}
        {/* ============================================ */}
        <SettingsSection icon={Mic} title={t("settings_voice", language)}>
          <Toggle label={t("settings_voice", language)} enabled={voiceEnabled} setEnabled={setVoiceEnabled} />
          <Toggle label={t("settings_read_aloud", language)} enabled={readAloud} setEnabled={setReadAloud} />
        </SettingsSection>

        {/* ============================================ */}
        {/* DISPLAY                                      */}
        {/* ============================================ */}
        <SettingsSection icon={Type} title={t("settings_text_size", language)}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                {t("settings_text_size", language)}
              </label>
              <div className="flex gap-2">
                {(["small", "medium", "large"] as TextSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => setTextSize(size)}
                    className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all border-2 ${
                      textSize === size
                        ? "bg-brand-500/5 border-brand-500 text-brand-600"
                        : "bg-surface-0 border-line/60 text-ink-muted hover:border-brand-500/40"
                    }`}
                  >
                    {t(`settings_text_${size}`, language)}
                  </button>
                ))}
              </div>
            </div>
            <Toggle label={t("settings_dark_mode", language)} enabled={darkMode} setEnabled={setDarkMode} />
            <Toggle
              label={t("settings_simple_language", language)}
              description={t("settings_simple_language_desc", language)}
              enabled={simpleLanguage}
              setEnabled={setSimpleLanguage}
            />
          </div>
        </SettingsSection>

        {/* ============================================ */}
        {/* EMERGENCY & PRIVACY                          */}
        {/* ============================================ */}
        <SettingsSection icon={Phone} title={t("settings_emergency_number", language)}>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-ink-base font-medium">
              {t("settings_emergency_number", language)}
            </span>
            <a
              href={`tel:${emergencyNumber}`}
              className="text-lg font-black text-danger-500 hover:underline"
            >
              {emergencyNumber}
            </a>
          </div>
        </SettingsSection>

        <SettingsSection icon={Shield} title={t("settings_privacy", language)}>
          <div className="flex items-center gap-2 py-2">
            <Shield size={16} className="text-success-500 flex-shrink-0" />
            <span className="text-sm text-ink-base font-medium">
              {t("settings_privacy_desc", language)}
            </span>
          </div>
        </SettingsSection>

        <div className="h-8" />
      </div>
    </div>
  );
}

/* ============================================================
 * Sub-components
 * ============================================================ */

function SettingsSection({
  icon: Icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface-1 rounded-2xl shadow-soft border border-line/40 overflow-hidden mb-4">
      <div className="p-4 bg-surface-2/50 border-b border-line/40 flex items-center gap-2">
        <Icon size={18} className="text-brand-500" />
        <h3 className="font-semibold text-ink-base">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function ModelOption({
  icon: Icon,
  title,
  description,
  badge,
  active,
  onClick,
}: {
  icon: any;
  title: string;
  description: string;
  badge: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
        active
          ? "bg-brand-500/5 border-brand-500"
          : "bg-surface-0 border-line/60 hover:border-brand-500/40"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon size={14} className={active ? "text-brand-500" : "text-ink-muted"} />
          <span className={`font-semibold text-sm ${active ? "text-brand-600" : "text-ink-base"}`}>
            {title}
          </span>
        </div>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
          badge === "FREE" ? "bg-brand-500/10 text-brand-600"
            : badge === "LOCAL" ? "bg-surface-3/60 text-ink-muted"
            : "bg-warning-500/10 text-warning-600"
        }`}>
          {badge}
        </span>
      </div>
      <p className="text-xs text-ink-muted mt-1">{description}</p>
    </button>
  );
}
