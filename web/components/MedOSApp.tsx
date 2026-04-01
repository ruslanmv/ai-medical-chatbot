"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { Sidebar, NavView } from "./chat/Sidebar";
import { RightPanel } from "./chat/RightPanel";
import { ChatView } from "./views/ChatView";
import { HomeView } from "./views/HomeView";
import { EmergencyView } from "./views/EmergencyView";
import { TopicsView } from "./views/TopicsView";
import { SettingsView } from "./views/SettingsView";
import { RecordsView } from "./views/RecordsView";
import { ScheduleView } from "./views/ScheduleView";
import { HistoryView } from "./views/HistoryView";
import { WelcomeScreen } from "./WelcomeScreen";
import { useSettings } from "@/lib/hooks/useSettings";
import { useChat } from "@/lib/hooks/useChat";
import { t, type SupportedLanguage } from "@/lib/i18n";

export default function MedOSApp() {
  const [activeNav, setActiveNav] = useState<NavView>("home");
  const settings = useSettings();
  const { messages, isTyping, error, sendMessage, clearMessages } = useChat();

  const handleSendMessage = (content: string) => {
    sendMessage(content, settings.provider, settings.apiKey);
    // Auto-navigate to chat when sending a message from home/topics
    if (activeNav !== "chat") {
      setActiveNav("chat");
    }
  };

  const handleStartVoice = () => {
    setActiveNav("chat");
    // Voice will auto-start via the ChatView component
  };

  const handleWelcomeComplete = (lang: SupportedLanguage, country: string) => {
    settings.setLanguage(lang);
    settings.setCountry(country);
    settings.setWelcomeCompleted(true);
  };

  const handleNavigate = (view: string) => {
    setActiveNav(view as NavView);
  };

  // Text size class
  const textSizeClass =
    settings.textSize === "large"
      ? "text-lg"
      : settings.textSize === "small"
      ? "text-sm"
      : "text-base";

  const renderContent = () => {
    switch (activeNav) {
      case "home":
        return (
          <HomeView
            language={settings.language}
            country={settings.country}
            emergencyNumber={settings.emergencyNumber}
            onNavigate={handleNavigate}
            onSendMessage={handleSendMessage}
            onStartVoice={handleStartVoice}
          />
        );
      case "emergency":
        return (
          <EmergencyView
            language={settings.language}
            emergencyNumber={settings.emergencyNumber}
          />
        );
      case "topics":
        return (
          <TopicsView
            language={settings.language}
            onSelectTopic={(topic) => handleSendMessage(`Tell me about ${topic}`)}
          />
        );
      case "settings":
        return (
          <SettingsView
            provider={settings.provider}
            setProvider={settings.setProvider}
            apiKey={settings.apiKey}
            setApiKey={settings.setApiKey}
            clearApiKey={settings.clearApiKey}
            advancedMode={settings.advancedMode}
            setAdvancedMode={settings.setAdvancedMode}
            language={settings.language}
            setLanguage={settings.setLanguage}
            country={settings.country}
            setCountry={settings.setCountry}
            voiceEnabled={settings.voiceEnabled}
            setVoiceEnabled={settings.setVoiceEnabled}
            readAloud={settings.readAloud}
            setReadAloud={settings.setReadAloud}
            textSize={settings.textSize}
            setTextSize={settings.setTextSize}
            simpleLanguage={settings.simpleLanguage}
            setSimpleLanguage={settings.setSimpleLanguage}
            darkMode={settings.darkMode}
            setDarkMode={settings.setDarkMode}
            emergencyNumber={settings.emergencyNumber}
          />
        );
      case "records":
        return <RecordsView />;
      case "schedule":
        return <ScheduleView />;
      case "history":
        return <HistoryView />;
      default:
        return (
          <ChatView
            messages={messages}
            isTyping={isTyping}
            onSendMessage={handleSendMessage}
            language={settings.language}
            emergencyNumber={settings.emergencyNumber}
            voiceEnabled={settings.voiceEnabled}
            readAloud={settings.readAloud}
            onNavigateEmergency={() => setActiveNav("emergency")}
          />
        );
    }
  };

  // Loading state
  if (!settings.isLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center animate-pulse">
            <Heart size={24} className="text-white" />
          </div>
          <p className="text-slate-500 font-medium">{t("loading", settings.language)}</p>
        </div>
      </div>
    );
  }

  // Welcome screen for first-time users
  if (!settings.welcomeCompleted) {
    return (
      <WelcomeScreen
        detectedLanguage={settings.language}
        detectedCountry={settings.country}
        onComplete={handleWelcomeComplete}
      />
    );
  }

  const hasActiveChat = messages.length > 1;

  return (
    <div className={`flex h-screen w-full bg-[#F8FAFC] font-sans text-slate-900 selection:bg-blue-100 ${textSizeClass}`}>
      {/* Sidebar */}
      <Sidebar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        language={settings.language}
        advancedMode={settings.advancedMode}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden pb-16 md:pb-0">
        {/* Top Header - simplified */}
        <header className="h-14 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-10">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
              <Heart size={14} />
            </div>
            <span className="font-bold text-slate-800">MedOS</span>
          </div>

          <h2 className="hidden md:block font-bold text-lg text-slate-800">
            {activeNav === "home"
              ? t("nav_home", settings.language)
              : activeNav === "chat"
              ? t("nav_ask", settings.language)
              : activeNav === "emergency"
              ? t("nav_emergency", settings.language)
              : activeNav === "topics"
              ? t("nav_topics", settings.language)
              : activeNav === "settings"
              ? t("nav_settings", settings.language)
              : activeNav}
          </h2>

          {/* Emergency button - always visible in header */}
          <a
            href={`tel:${settings.emergencyNumber}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-xs font-bold border border-red-200 hover:bg-red-100 transition-colors"
          >
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            {settings.emergencyNumber}
          </a>
        </header>

        {/* Dynamic Content Area */}
        <main className="flex-1 flex relative overflow-hidden bg-[#F8FAFC]">
          <div className="flex-1 flex flex-col relative">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Right Panel - context-aware */}
      <RightPanel
        onScheduleClick={() => setActiveNav("schedule")}
        language={settings.language}
        emergencyNumber={settings.emergencyNumber}
        hasActiveChat={hasActiveChat}
        onNavigate={handleNavigate}
        onStartVoice={handleStartVoice}
      />
    </div>
  );
}
