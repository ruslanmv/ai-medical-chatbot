'use client';

import { useState, useEffect } from 'react';
import { Check, ExternalLink, RefreshCw, Link2, Wifi, WifiOff } from 'lucide-react';
import type { SupportedLanguage } from '@/lib/i18n';

interface SettingsViewProps {
  language: SupportedLanguage;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
}

export interface AppSettings {
  ollabridge_url: string;
  model: string;
  hf_token: string;
  use_custom_backend: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  ollabridge_url: 'https://ruslanmv-ollabridge.hf.space',
  model: 'qwen2.5:1.5b',
  hf_token: '',
  use_custom_backend: false,
};

const MODEL_OPTIONS = [
  { id: 'free-best', label: 'Best Quality (Free)', desc: 'Auto-selects best free model (Gemini, Groq, etc.)' },
  { id: 'free-fast', label: 'Fastest (Free)', desc: 'Lowest latency provider (Groq)' },
  { id: 'free-flex', label: 'Flexible (Free)', desc: 'Routes across free-tier models' },
  { id: 'cheap-reasoning', label: 'Deep Reasoning', desc: 'DeepSeek for complex medical reasoning' },
  { id: 'qwen2.5:1.5b', label: 'Local (Qwen 2.5)', desc: 'Runs on the server, always available' },
];

export default function SettingsView({
  settings,
  onUpdateSettings,
}: SettingsViewProps) {
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const testConnection = async () => {
    setConnectionStatus('testing');
    try {
      const url = localSettings.ollabridge_url.replace(/\/$/, '');
      const response = await fetch(`${url}/v1/models`, {
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) {
        const data = await response.json();
        const models = (data.data || []).map((m: { id: string }) => m.id);
        setAvailableModels(models);
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('error');
      }
    } catch {
      setConnectionStatus('error');
    }
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
  };

  return (
    <div className="flex-1 overflow-y-auto scroll-smooth">
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-700/50">
        <h2 className="text-lg font-bold text-slate-100">Settings</h2>
        <p className="text-sm text-slate-400 mt-1">Configure your AI provider and preferences</p>
      </div>

      <div className="p-4 space-y-6">
        {/* AI Model Selection */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">AI Model</h3>
          <div className="space-y-2">
            {MODEL_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setLocalSettings({ ...localSettings, model: option.id })}
                className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all
                  ${localSettings.model === option.id
                    ? 'bg-medical-primary/10 border border-medical-primary/30'
                    : 'bg-slate-800/50 border border-slate-700/30 hover:bg-slate-800'
                  }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                  ${localSettings.model === option.id
                    ? 'border-medical-primary bg-medical-primary'
                    : 'border-slate-500'
                  }`}>
                  {localSettings.model === option.id && <Check size={10} className="text-white" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">{option.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{option.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* OllaBridge Connection */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">
            <span className="flex items-center gap-2">
              <Link2 size={14} />
              OllaBridge Connection
            </span>
          </h3>

          {/* Custom backend toggle */}
          <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/30 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={localSettings.use_custom_backend}
              onChange={(e) => setLocalSettings({ ...localSettings, use_custom_backend: e.target.checked })}
              className="w-4 h-4 rounded border-slate-500 text-medical-primary focus:ring-medical-primary"
            />
            <div>
              <p className="text-sm text-slate-200">Use custom OllaBridge server</p>
              <p className="text-xs text-slate-500">Connect to your own GPU or local models</p>
            </div>
          </label>

          {localSettings.use_custom_backend && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">OllaBridge URL</label>
                <input
                  type="url"
                  value={localSettings.ollabridge_url}
                  onChange={(e) => setLocalSettings({ ...localSettings, ollabridge_url: e.target.value })}
                  placeholder="https://your-ollabridge.example.com"
                  className="w-full bg-slate-800 border border-slate-700/50 rounded-lg px-3 py-2.5
                             text-sm text-slate-100 placeholder-slate-500
                             focus:outline-none focus:ring-2 focus:ring-medical-primary/50"
                />
              </div>

              <button
                onClick={testConnection}
                disabled={connectionStatus === 'testing'}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg
                           bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm
                           transition-colors touch-target disabled:opacity-50"
              >
                {connectionStatus === 'testing' ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : connectionStatus === 'connected' ? (
                  <Wifi size={14} className="text-green-400" />
                ) : connectionStatus === 'error' ? (
                  <WifiOff size={14} className="text-red-400" />
                ) : (
                  <Link2 size={14} />
                )}
                {connectionStatus === 'testing'
                  ? 'Testing...'
                  : connectionStatus === 'connected'
                    ? 'Connected'
                    : connectionStatus === 'error'
                      ? 'Connection Failed — Retry'
                      : 'Test Connection'}
              </button>

              {/* Available models from custom backend */}
              {availableModels.length > 0 && (
                <div className="p-3 rounded-lg bg-green-950/20 border border-green-800/20">
                  <p className="text-xs font-semibold text-green-300 mb-2">
                    Available Models ({availableModels.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {availableModels.map((model) => (
                      <button
                        key={model}
                        onClick={() => setLocalSettings({ ...localSettings, model })}
                        className={`px-2 py-1 rounded text-xs transition-colors
                          ${localSettings.model === model
                            ? 'bg-medical-primary text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* HuggingFace Token (optional) */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-2">HuggingFace Token (Optional)</h3>
          <p className="text-xs text-slate-500 mb-2">Provide your own HF token for higher rate limits</p>
          <input
            type="password"
            value={localSettings.hf_token}
            onChange={(e) => setLocalSettings({ ...localSettings, hf_token: e.target.value })}
            placeholder="hf_..."
            className="w-full bg-slate-800 border border-slate-700/50 rounded-lg px-3 py-2.5
                       text-sm text-slate-100 placeholder-slate-500
                       focus:outline-none focus:ring-2 focus:ring-medical-primary/50"
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full py-3 rounded-xl bg-medical-primary hover:bg-blue-500
                     text-white text-sm font-semibold transition-colors touch-target"
        >
          Save Settings
        </button>

        {/* About Section */}
        <div className="pt-4 border-t border-slate-700/30">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">About</h3>
          <div className="space-y-2 text-xs text-slate-500">
            <p><strong className="text-slate-400">Version:</strong> 1.0.0</p>
            <p><strong className="text-slate-400">Backend:</strong> OllaBridge-Cloud (multi-provider LLM gateway)</p>
            <p><strong className="text-slate-400">Languages:</strong> 20 (auto-detected)</p>
            <p><strong className="text-slate-400">Privacy:</strong> Zero data retention. No conversations stored.</p>
          </div>
          <div className="flex gap-3 mt-3">
            <a
              href="https://github.com/ruslanmv/ai-medical-chatbot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 transition-colors"
            >
              <ExternalLink size={12} /> Source Code
            </a>
            <a
              href="https://github.com/ruslanmv/ollabridge"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 transition-colors"
            >
              <ExternalLink size={12} /> OllaBridge
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
