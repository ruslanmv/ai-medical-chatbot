"use client";

import { useState } from "react";
import { Zap, Bell } from "lucide-react";
import { Sidebar, NavView } from "./chat/Sidebar";
import { RightPanel } from "./chat/RightPanel";
import { ChatView } from "./views/ChatView";
import { SettingsView } from "./views/SettingsView";
import { RecordsView } from "./views/RecordsView";
import { ScheduleView } from "./views/ScheduleView";
import { HistoryView } from "./views/HistoryView";
import { useSettings } from "@/lib/hooks/useSettings";
import { useChat } from "@/lib/hooks/useChat";

export default function MedOSApp() {
  const [activeNav, setActiveNav] = useState<NavView>("chat");
  const { provider, setProvider, apiKey, setApiKey, clearApiKey, isLoaded } =
    useSettings();
  const { messages, isTyping, error, sendMessage, clearMessages } = useChat();

  const handleSendMessage = (content: string) => {
    sendMessage(content, provider, apiKey);
  };

  const renderContent = () => {
    switch (activeNav) {
      case "settings":
        return (
          <SettingsView
            provider={provider}
            setProvider={setProvider}
            apiKey={apiKey}
            setApiKey={setApiKey}
            clearApiKey={clearApiKey}
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
          />
        );
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center animate-pulse">
            <Zap size={24} className="text-white" />
          </div>
          <p className="text-slate-500 font-medium">Loading MedOS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] font-sans text-slate-900 selection:bg-blue-100">
      {/* Sidebar */}
      <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-10">
          <h2 className="font-bold text-lg text-slate-800 capitalize">
            {activeNav === "chat" ? "Current Session" : activeNav}
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-100">
              <Zap size={12} fill="currentColor" />
              <span>Plus Plan</span>
            </div>
            <button className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors relative">
              <Bell size={16} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full border border-white" />
            </button>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <main className="flex-1 flex relative overflow-hidden bg-[#F8FAFC]">
          <div className="flex-1 flex flex-col relative">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Right Panel */}
      <RightPanel onScheduleClick={() => setActiveNav("schedule")} />
    </div>
  );
}
