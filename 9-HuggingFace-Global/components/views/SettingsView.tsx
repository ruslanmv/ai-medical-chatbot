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
  Cpu,
  Key,
  Activity,
  AlertTriangle,
  Eye,
  EyeOff,
  Mic,
  BookOpen,
} from "lucide-react";
import { Toggle } from "../chat/Toggle";
import type { Provider, Preset } from "@/lib/types";
import { PROVIDER_CONFIGS } from "@/lib/types";

const PRESET_OPTIONS: {
  id: Preset;
  title: string;
  description: string;
  badge: string;
}[] = [
  {
    id: "free-best",
    title: "Best Quality (Free)",
    description: "Llama 3.3 70B via Groq with auto fallbacks",
    badge: "FREE · RECOMMENDED",
  },
  {
    id: "free-fastest",
    title: "Fastest (Free)",
    description: "Lowest latency — pinned to Groq",
    badge: "FREE",
  },
  {
    id: "free-flexible",
    title: "Flexible (Free)",
    description: "Qwen 2.5 72B, auto-routed across providers",
    badge: "FREE",
  },
  {
    id: "deep-reasoning",
    title: "Deep Reasoning",
    description: "DeepSeek R1 for complex medical reasoning",
    badge: "FREE",
  },
  {
    id: "local",
    title: "Local (Qwen 2.5)",
    description: "Runs on the server via Ollama — always available",
    badge: "LOCAL",
  },
  {
    id: "ollabridge",
    title: "OllaBridge Connection",
    description: "Custom gateway — use your own GPU / local models",
    badge: "CUSTOM",
  },
];
import {
  t,
  LANGUAGE_NAMES,
  getCountryName,
  type SupportedLanguage,
} from "@/lib/i18n";
import type { TextSize } from "@/lib/hooks/useSettings";

interface SettingsViewProps {
  // Preset (patient-friendly default)
  preset: Preset;
  setPreset: (p: Preset) => void;
  hfToken: string;
  setHfToken: (v: string) => void;
  clearHfToken: () => void;
  // Advanced: raw provider settings
  provider: Provider;
  setProvider: (provider: Provider) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
  // New patient-friendly settings
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
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<{
    success?: boolean;
    message?: string;
  }>({});

  const handleVerifyConnection = async () => {
    if (!apiKey.trim()) {
      setVerifyStatus({
        success: false,
        message: "Please enter an API key first",
      });
      return;
    }

    setIsVerifying(true);
    setVerifyStatus({});

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, userHfToken: hfToken }),
      });

      const data = await response.json();

      if (data.success) {
        setVerifyStatus({
          success: true,
          message: "Connection verified successfully!",
        });
      } else {
        setVerifyStatus({
          success: false,
          message: data.error || "Connection failed",
        });
      }
    } catch (error: any) {
      setVerifyStatus({
        success: false,
        message: error?.message || "Network error",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 pb-mobile-nav scroll-touch">
      <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">
          {t("settings_title", language)}
        </h2>

        {/* ============================================ */}
        {/* AI MODEL — preset-first, patient-friendly    */}
        {/* ============================================ */}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-4">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <Cpu size={18} className="text-blue-500" />
            <h3 className="font-semibold text-slate-700">AI Model</h3>
          </div>
          <div className="p-4 space-y-2">
            {PRESET_OPTIONS.map((opt) => {
              const active = preset === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setPreset(opt.id)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                    active
                      ? "bg-blue-50 border-blue-500"
                      : "bg-white border-slate-200 hover:border-blue-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-semibold text-sm ${
                        active ? "text-blue-700" : "text-slate-700"
                      }`}
                    >
                      {opt.title}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        opt.badge.includes("RECOMMENDED")
                          ? "bg-emerald-100 text-emerald-700"
                          : opt.badge === "FREE"
                          ? "bg-blue-100 text-blue-700"
                          : opt.badge === "LOCAL"
                          ? "bg-slate-200 text-slate-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {opt.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{opt.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* HuggingFace token (optional) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-4">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <Key size={18} className="text-indigo-500" />
            <h3 className="font-semibold text-slate-700">
              HuggingFace Token (Optional)
            </h3>
          </div>
          <div className="p-4">
            <p className="text-xs text-slate-500 mb-2">
              Provide your own HF token for higher rate limits. Leave blank to
              use the server-side default.
            </p>
            <div className="relative">
              <input
                type="password"
                value={hfToken}
                onChange={(e) => setHfToken(e.target.value)}
                placeholder="hf_..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2.5 pl-9 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-sm"
              />
              <Key
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={14}
              />
            </div>
            {hfToken && (
              <button
                onClick={clearHfToken}
                className="text-xs text-rose-600 hover:underline mt-2"
              >
                Clear HF token
              </button>
            )}
          </div>
        </div>

        {/* ============================================ */}
        {/* BASIC PATIENT-FRIENDLY SETTINGS              */}
        {/* ============================================ */}

        {/* Language */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-4">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <Globe size={18} className="text-blue-500" />
            <h3 className="font-semibold text-slate-700">{t("settings_language", language)}</h3>
          </div>
          <div className="p-4 space-y-4">
            {/* Language select */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">
                {t("settings_language", language)}
              </label>
              <div className="relative">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-base"
                >
                  {(Object.entries(LANGUAGE_NAMES) as [SupportedLanguage, string][]).map(
                    ([code, name]) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    )
                  )}
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={16}
                />
              </div>
            </div>

            {/* Country select */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">
                {t("settings_country", language)}
              </label>
              <div className="relative">
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-base"
                >
                  {COUNTRIES.map((code) => (
                    <option key={code} value={code}>
                      {getCountryName(code)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={16}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Voice & Accessibility */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-4">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <Mic size={18} className="text-indigo-500" />
            <h3 className="font-semibold text-slate-700">{t("settings_voice", language)}</h3>
          </div>
          <div className="p-4">
            <Toggle
              label={t("settings_voice", language)}
              enabled={voiceEnabled}
              setEnabled={setVoiceEnabled}
            />
            <Toggle
              label={t("settings_read_aloud", language)}
              enabled={readAloud}
              setEnabled={setReadAloud}
            />
          </div>
        </div>

        {/* Text & Display */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-4">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <Type size={18} className="text-slate-500" />
            <h3 className="font-semibold text-slate-700">{t("settings_text_size", language)}</h3>
          </div>
          <div className="p-4 space-y-4">
            {/* Text size */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">
                {t("settings_text_size", language)}
              </label>
              <div className="flex gap-2">
                {(["small", "medium", "large"] as TextSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => setTextSize(size)}
                    className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all border-2 ${
                      textSize === size
                        ? "bg-blue-50 border-blue-500 text-blue-700"
                        : "bg-white border-slate-200 text-slate-600 hover:border-blue-200"
                    }`}
                  >
                    {t(`settings_text_${size}`, language)}
                  </button>
                ))}
              </div>
            </div>

            <Toggle
              label={t("settings_dark_mode", language)}
              enabled={darkMode}
              setEnabled={setDarkMode}
            />
          </div>
        </div>

        {/* Simple language */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-4">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <BookOpen size={18} className="text-emerald-500" />
            <h3 className="font-semibold text-slate-700">{t("settings_simple_language", language)}</h3>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm text-slate-700 font-medium block">
                  {t("settings_simple_language", language)}
                </span>
                <span className="text-xs text-slate-400 block mt-0.5">
                  {t("settings_simple_language_desc", language)}
                </span>
              </div>
              <button
                onClick={() => setSimpleLanguage(!simpleLanguage)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${
                  simpleLanguage ? "bg-blue-600" : "bg-slate-200"
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                    simpleLanguage ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Emergency number */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-4">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <Phone size={18} className="text-red-500" />
            <h3 className="font-semibold text-slate-700">{t("settings_emergency_number", language)}</h3>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700 font-medium">
                {t("settings_emergency_number", language)}
              </span>
              <span className="text-lg font-bold text-red-600">{emergencyNumber}</span>
            </div>
          </div>
        </div>

        {/* Privacy */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-4">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <Shield size={18} className="text-emerald-500" />
            <h3 className="font-semibold text-slate-700">{t("settings_privacy", language)}</h3>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-emerald-500" />
              <span className="text-sm text-slate-700 font-medium">
                {t("settings_privacy_desc", language)}
              </span>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* ADVANCED TECHNICAL SETTINGS (HIDDEN)         */}
        {/* ============================================ */}

        <div className="mt-8 text-center">
          <button
            onClick={() => setAdvancedMode(!advancedMode)}
            className="text-sm text-slate-400 hover:text-slate-600 font-medium transition-colors inline-flex items-center gap-1.5"
          >
            {advancedMode ? <EyeOff size={14} /> : <Eye size={14} />}
            {advancedMode ? t("settings_hide_advanced", language) : t("settings_advanced", language)}
          </button>
        </div>

        {advancedMode && (
          <div className="mt-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Warning banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-700 font-medium">
                {t("settings_advanced_warning", language)}
              </p>
            </div>

            {/* Managed mode toggle */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-4">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-slate-700 font-medium block">
                      {t("settings_managed_mode", language)}
                    </span>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      {t("settings_managed_desc", language)}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      // If turning on managed mode, clear API key
                      if (apiKey) clearApiKey();
                    }}
                    className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors"
                  >
                    {t("settings_managed_mode", language)}
                  </button>
                </div>
              </div>
            </div>

            {/* AI Intelligence Engine - original provider settings */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-4">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <Cpu size={18} className="text-slate-500" />
                <h3 className="font-semibold text-slate-700">
                  {t("settings_provider", language)}
                </h3>
              </div>

              <div className="p-4 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Provider Select */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t("settings_provider", language)}
                    </label>
                    <div className="relative">
                      <select
                        value={provider}
                        onChange={(e) => {
                          setProvider(e.target.value as Provider);
                          setVerifyStatus({});
                        }}
                        className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                      >
                        {Object.entries(PROVIDER_CONFIGS).map(([key, config]) => (
                          <option key={key} value={key}>
                            {config.displayName}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        size={14}
                      />
                    </div>
                  </div>

                  {/* API Key / Endpoint Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {provider === "ollama"
                        ? t("settings_custom_server", language)
                        : t("settings_api_key", language)}
                    </label>
                    <div className="relative">
                      <input
                        type={provider === "ollama" ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => {
                          setApiKey(e.target.value);
                          setVerifyStatus({});
                        }}
                        placeholder={
                          provider === "ollama"
                            ? "http://localhost:11434"
                            : "sk-................"
                        }
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2.5 pl-9 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-sm"
                      />
                      <Key
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        size={14}
                      />
                    </div>
                  </div>
                </div>

                {/* Validation & Status */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-50 mt-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        verifyStatus.success === true
                          ? "bg-emerald-500"
                          : verifyStatus.success === false
                          ? "bg-rose-500"
                          : provider === "ollama"
                          ? "bg-emerald-500"
                          : "bg-blue-500"
                      }`}
                    ></div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {verifyStatus.message || "Standard Encryption: ACTIVE"}
                    </span>
                  </div>
                  <button
                    onClick={handleVerifyConnection}
                    disabled={isVerifying || !apiKey.trim()}
                    className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors border border-blue-100 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Activity size={12} />
                    {isVerifying ? "Verifying..." : t("settings_verify", language)}
                  </button>
                </div>

                {/* Clear API Key */}
                {apiKey && (
                  <button
                    onClick={clearApiKey}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    {t("settings_clear_key", language)}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
