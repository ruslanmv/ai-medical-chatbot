'use client';

import { useState, useEffect, useCallback } from 'react';
import { detectLanguage, getLanguageDirection, type SupportedLanguage } from '@/lib/i18n';
import { initViewport } from '@/lib/mobile/viewport';
import { initPWA } from '@/lib/mobile/pwa';
import { onConnectivityChange, isOnline } from '@/lib/mobile/offline-cache';
import { detectCountryFromTimezone } from '@/lib/safety/emergency-numbers';
import { useGeoDetect } from '@/lib/hooks/useGeoDetect';
import Sidebar from './chat/Sidebar';
import RightPanel from './chat/RightPanel';
import BottomNav from './mobile/BottomNav';
import ChatView from './views/ChatView';
import TopicsView from './views/TopicsView';
import EmergencyView from './views/EmergencyView';
import LanguageView from './views/LanguageView';
import ShareView from './views/ShareView';
import SettingsView, { type AppSettings, DEFAULT_SETTINGS } from './views/SettingsView';
import AboutView from './views/AboutView';
import DisclaimerBanner from './ui/DisclaimerBanner';
import OfflineBanner from './ui/OfflineBanner';
import InstallPrompt from './ui/InstallPrompt';

export type ViewType = 'chat' | 'topics' | 'emergency' | 'language' | 'share' | 'settings' | 'about';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isEmergency?: boolean;
}

const SETTINGS_STORAGE_KEY = 'medos-settings';

function loadSettings(): AppSettings {
  if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: AppSettings): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // silently fail
  }
}

export default function MedOSGlobalApp() {
  const [currentView, setCurrentView] = useState<ViewType>('chat');
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [countryCode, setCountryCode] = useState('US');
  // When the user manually picks a language (via LanguageView or Settings)
  // we flip this flag so subsequent IP-based auto-detection never
  // overrides their explicit choice.
  const [explicitLocale, setExplicitLocale] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [online, setOnline] = useState(true);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Initialize on mount
  useEffect(() => {
    const detectedLang = detectLanguage();
    setLanguage(detectedLang);

    const country = detectCountryFromTimezone();
    setCountryCode(country);

    const dir = getLanguageDirection(detectedLang);
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', detectedLang);

    setSettings(loadSettings());
    initPWA();
    const cleanupViewport = initViewport();
    setOnline(isOnline());
    const cleanupConnectivity = onConnectivityChange(setOnline);

    return () => {
      cleanupViewport?.();
      cleanupConnectivity();
    };
  }, []);

  // Server-authoritative IP-based geo detection. Runs once on mount,
  // silently, and only applies its result if the user hasn't made an
  // explicit locale choice yet — manual picks win forever.
  const applyGeo = useCallback(
    (g: { country: string; language: SupportedLanguage }) => {
      if (explicitLocale) return;
      setCountryCode(g.country);
      setLanguage(g.language);
      const dir = getLanguageDirection(g.language);
      document.documentElement.setAttribute('dir', dir);
      document.documentElement.setAttribute('lang', g.language);
    },
    [explicitLocale],
  );
  useGeoDetect({ skip: explicitLocale, onResult: applyGeo });

  const handleLanguageChange = useCallback((lang: SupportedLanguage) => {
    setExplicitLocale(true);
    setLanguage(lang);
    const dir = getLanguageDirection(lang);
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
  }, []);

  const handleUpdateSettings = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    setCurrentView('chat');
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      try {
        const allMessages = [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user' as const, content: content.trim() },
        ];

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: allMessages,
            model: settings.model || 'qwen2.5:1.5b',
            language,
            countryCode,
            ollabridge_url: settings.use_custom_backend ? settings.ollabridge_url : undefined,
          }),
        });

        if (!response.ok) throw new Error('Chat request failed');

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response stream');

        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullContent += delta;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastIdx = updated.length - 1;
                    if (updated[lastIdx]?.role === 'assistant') {
                      updated[lastIdx] = {
                        ...updated[lastIdx],
                        content: fullContent,
                        isEmergency: parsed.isEmergency || false,
                      };
                    }
                    return updated;
                  });
                }
              } catch {
                // Skip malformed SSE chunks
              }
            }
          }
        }
      } catch (error) {
        console.error('[Chat Error]:', error);
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx]?.role === 'assistant') {
            updated[lastIdx] = {
              ...updated[lastIdx],
              content:
                'I apologize, but I\'m having trouble connecting right now. Please try again in a moment. If you are experiencing a medical emergency, please call your local emergency number immediately.',
            };
          }
          return updated;
        });
      } finally {
        setIsLoading(false);
      }
    },
    [messages, language, countryCode, isLoading, settings]
  );

  const renderView = () => {
    switch (currentView) {
      case 'topics':
        return (
          <TopicsView
            language={language}
            onSelectTopic={(topic) => {
              setCurrentView('chat');
              sendMessage(topic);
            }}
          />
        );
      case 'emergency':
        return <EmergencyView countryCode={countryCode} language={language} />;
      case 'language':
        return (
          <LanguageView
            currentLanguage={language}
            onSelectLanguage={(lang) => {
              handleLanguageChange(lang);
              setCurrentView('chat');
            }}
          />
        );
      case 'share':
        return <ShareView language={language} />;
      case 'settings':
        return (
          <SettingsView
            language={language}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
          />
        );
      case 'about':
        return <AboutView />;
      default:
        return (
          <ChatView
            messages={messages}
            isLoading={isLoading}
            language={language}
            onSendMessage={sendMessage}
          />
        );
    }
  };

  return (
    <div className="h-screen-safe flex flex-col bg-slate-900 pt-safe">
      {!online && <OfflineBanner language={language} />}
      <InstallPrompt />

      <div className="flex flex-1 overflow-hidden">
        <div className="desktop-sidebar w-64 border-r border-slate-700/50 flex-shrink-0">
          <Sidebar
            currentView={currentView}
            onNavigate={setCurrentView}
            language={language}
          />
        </div>

        <main className="flex-1 flex flex-col min-w-0">
          {renderView()}
          <DisclaimerBanner language={language} />
        </main>

        <div className="desktop-right-panel w-72 border-l border-slate-700/50 flex-shrink-0">
          <RightPanel
            countryCode={countryCode}
            language={language}
            onNavigate={setCurrentView}
          />
        </div>
      </div>

      <div className="mobile-bottom-nav pb-safe">
        <BottomNav
          currentView={currentView}
          onNavigate={setCurrentView}
          language={language}
        />
      </div>
    </div>
  );
}
