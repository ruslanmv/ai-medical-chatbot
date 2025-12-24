"use client";

import { useState } from "react";
import { User, Bell, Shield, LogOut, Cpu, Key, ChevronDown, Activity } from "lucide-react";
import { Toggle } from "../chat/Toggle";
import type { Provider } from "@/lib/types";
import { PROVIDER_CONFIGS } from "@/lib/types";

interface SettingsViewProps {
  provider: Provider;
  setProvider: (provider: Provider) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
}

export function SettingsView({
  provider,
  setProvider,
  apiKey,
  setApiKey,
  clearApiKey,
}: SettingsViewProps) {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(true);
  const [shareData, setShareData] = useState(false);
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
        body: JSON.stringify({ provider, apiKey }),
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
    <div className="p-8 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">
        Settings & Preferences
      </h2>

      {/* Account Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
          <User size={18} className="text-slate-500" />
          <h3 className="font-semibold text-slate-700">Account</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
              SC
            </div>
            <div>
              <div className="font-bold text-slate-800">Sarah Connor</div>
              <div className="text-sm text-slate-500">
                sarah.c@example.com
              </div>
              <button className="text-sm text-blue-600 font-medium mt-1">
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Intelligence Engine */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
          <Cpu size={18} className="text-slate-500" />
          <h3 className="font-semibold text-slate-700">
            AI Intelligence Engine
          </h3>
        </div>

        <div className="p-4 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Provider Select */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                LLM Backend
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
                {provider === "ollama" ? "Local Endpoint" : "API Secret Key"}
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
                {verifyStatus.message ||
                  (provider === "watsonx"
                    ? "Enterprise Encryption: ACTIVE"
                    : "Standard Encryption: ACTIVE")}
              </span>
            </div>
            <button
              onClick={handleVerifyConnection}
              disabled={isVerifying || !apiKey.trim()}
              className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors border border-blue-100 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Activity size={12} />
              {isVerifying ? "Verifying..." : "Verify Connection"}
            </button>
          </div>

          {/* Clear API Key */}
          {apiKey && (
            <button
              onClick={clearApiKey}
              className="text-xs text-rose-600 hover:underline"
            >
              Clear API Key
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
          <Bell size={18} className="text-slate-500" />
          <h3 className="font-semibold text-slate-700">Notifications</h3>
        </div>
        <div className="p-4">
          <Toggle
            label="Push Notifications"
            enabled={notifications}
            setEnabled={setNotifications}
          />
          <Toggle
            label="Email Summaries"
            enabled={true}
            setEnabled={() => {}}
          />
          <Toggle
            label="Appointment Reminders"
            enabled={true}
            setEnabled={() => {}}
          />
        </div>
      </div>

      {/* Privacy & Data */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
          <Shield size={18} className="text-slate-500" />
          <h3 className="font-semibold text-slate-700">Privacy & Data</h3>
        </div>
        <div className="p-4">
          <Toggle
            label="Strict Privacy Mode (No Cloud Logging)"
            enabled={privacyMode}
            setEnabled={setPrivacyMode}
          />
          <Toggle
            label="Share Vitals with Cardiologist"
            enabled={shareData}
            setEnabled={setShareData}
          />
        </div>
      </div>

      {/* Sign Out */}
      <button className="w-full py-3 rounded-xl border border-rose-200 text-rose-600 font-medium hover:bg-rose-50 transition-colors flex items-center justify-center gap-2">
        <LogOut size={18} />
        Sign Out
      </button>
    </div>
  );
}
