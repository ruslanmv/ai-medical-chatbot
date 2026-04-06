"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Heart } from "lucide-react";
import { useGeoDetect } from "@/lib/hooks/useGeoDetect";
import { ThemeProvider } from "./ThemeProvider";
import { ThemeToggle } from "./ThemeToggle";
import { EmergencyCTA } from "./chat/EmergencyCTA";
import { Sidebar, NavView } from "./chat/Sidebar";
import { RightPanel } from "./chat/RightPanel";
import { NotificationBell } from "./chat/NotificationCenter";
import { ChatView } from "./views/ChatView";
import { HomeView } from "./views/HomeView";
import { EmergencyView } from "./views/EmergencyView";
import { TopicsView } from "./views/TopicsView";
import { SettingsView } from "./views/SettingsView";
import { RecordsView } from "./views/RecordsView";
import { HistoryView } from "./views/HistoryView";
import { MedicationsView } from "./views/MedicationsView";
import { AppointmentsView } from "./views/AppointmentsView";
import { VitalsView } from "./views/VitalsView";
import { HealthDashboard } from "./views/HealthDashboard";
import { ScheduleView } from "./views/ScheduleView";
import { WelcomeScreen } from "./WelcomeScreen";
import { useSettings } from "@/lib/hooks/useSettings";
import { useChat } from "@/lib/hooks/useChat";
import { useHealthStore } from "@/lib/hooks/useHealthStore";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { useAuth } from "@/lib/hooks/useAuth";
import { LoginView } from "./views/LoginView";
import { ProfileView } from "./views/ProfileView";
import { t, type SupportedLanguage } from "@/lib/i18n";

export default function MedOSApp() {
  return (
    <ThemeProvider>
      <MedOSAppInner />
    </ThemeProvider>
  );
}

function MedOSAppInner() {
  const [activeNav, setActiveNav] = useState<NavView>("home");
  const settings = useSettings();
  const auth = useAuth();
  const { messages, isTyping, error, sendMessage, clearMessages } = useChat();
  const health = useHealthStore(auth.token);
  const notif = useNotifications();

  // IP-based auto-detection. Only applies if the user hasn't manually
  // chosen a language yet; the manual override in Settings wins forever.
  const onGeo = useCallback(
    (g: { country: string; language: any; emergencyNumber: string }) => {
      settings.applyGeo(g);
    },
    [settings],
  );
  useGeoDetect({
    skip: !settings.isLoaded || settings.explicitLanguage,
    onResult: onGeo,
  });

  const handleSendMessage = (content: string) => {
    sendMessage(content, {
      preset: settings.advancedMode ? undefined : settings.preset,
      provider: settings.advancedMode ? settings.provider : undefined,
      // In advanced mode we let the server default the model; the
      // dedicated provider files pick their own canonical model.
      apiKey: settings.apiKey,
      userHfToken: settings.hfToken || undefined,
      context: {
        country: settings.country,
        language: settings.language,
        emergencyNumber: settings.emergencyNumber,
      },
    });
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
    // Welcome completion is an explicit user choice — lock it in so
    // subsequent IP auto-detection never overrides it.
    settings.setLanguageExplicit(lang);
    settings.setCountryExplicit(country);
    settings.setWelcomeCompleted(true);
  };

  // Auto-save the current chat session to history when navigating away
  // from the chat view, or when the AI finishes responding and there are
  // enough messages to be worth saving.
  const lastSavedCount = useRef(0);
  useEffect(() => {
    const userMsgs = messages.filter((m) => m.role === "user");
    if (
      userMsgs.length > 0 &&
      messages.length >= 3 &&
      messages.length !== lastSavedCount.current &&
      !isTyping
    ) {
      lastSavedCount.current = messages.length;
      health.saveSession({
        date: new Date().toISOString(),
        preview: userMsgs[0].content.slice(0, 120),
        messageCount: messages.length,
        topic: undefined,
      });
    }
  }, [messages.length, isTyping]); // eslint-disable-line react-hooks/exhaustive-deps

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
            preset={settings.preset}
            setPreset={settings.setPreset}
            hfToken={settings.hfToken}
            setHfToken={settings.setHfToken}
            clearHfToken={settings.clearHfToken}
            provider={settings.provider}
            setProvider={settings.setProvider}
            apiKey={settings.apiKey}
            setApiKey={settings.setApiKey}
            clearApiKey={settings.clearApiKey}
            advancedMode={settings.advancedMode}
            setAdvancedMode={settings.setAdvancedMode}
            language={settings.language}
            setLanguage={settings.setLanguageExplicit}
            country={settings.country}
            setCountry={settings.setCountryExplicit}
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
      case "schedule":
        return (
          <ScheduleView
            medications={health.medications}
            medicationLogs={health.medicationLogs}
            appointments={health.appointments}
            onMarkMedTaken={health.markMedTaken}
            isMedTaken={health.isMedTaken}
            onEditAppointment={health.editAppointment}
            onNavigate={handleNavigate}
            language={settings.language}
          />
        );
      case "health-dashboard":
        return (
          <HealthDashboard
            medications={health.medications}
            medicationLogs={health.medicationLogs}
            appointments={health.appointments}
            vitals={health.vitals}
            records={health.records}
            onNavigate={handleNavigate}
            onMarkMedTaken={health.markMedTaken}
            isMedTaken={health.isMedTaken}
            getMedStreak={health.getMedStreak}
            onExport={health.downloadAll}
            language={settings.language}
          />
        );
      case "medications":
        return (
          <MedicationsView
            medications={health.medications}
            onAdd={health.addMedication}
            onEdit={health.editMedication}
            onDelete={health.deleteMedication}
            onMarkTaken={health.markMedTaken}
            isTaken={health.isMedTaken}
            getStreak={health.getMedStreak}
            language={settings.language}
          />
        );
      case "appointments":
        return (
          <AppointmentsView
            appointments={health.appointments}
            onAdd={health.addAppointment}
            onEdit={health.editAppointment}
            onDelete={health.deleteAppointment}
            language={settings.language}
          />
        );
      case "vitals":
        return (
          <VitalsView
            vitals={health.vitals}
            onAdd={health.addVital}
            onDelete={health.deleteVital}
            language={settings.language}
          />
        );
      case "records":
        return (
          <RecordsView
            records={health.records}
            onAdd={health.addRecord}
            onEdit={health.editRecord}
            onDelete={health.deleteRecord}
            onExport={health.downloadAll}
            language={settings.language}
          />
        );
      case "history":
        return (
          <HistoryView
            history={health.history}
            onDelete={health.deleteSession}
            onClearAll={health.clearAllHistory}
            onReplay={(preview) => handleSendMessage(preview)}
            language={settings.language}
          />
        );
      case "login":
        return (
          <LoginView
            onLogin={async (e, p) => {
              const res = await auth.login(e, p);
              if (res.ok) setActiveNav("home");
              return res;
            }}
            onRegister={async (e, p, o) => {
              const res = await auth.register(e, p, o);
              if (res.ok && !res.needsVerification) setActiveNav("home");
              return res;
            }}
            onVerifyEmail={async (code) => {
              const res = await auth.verifyEmail(code);
              if (res.ok) setActiveNav("home");
              return res;
            }}
            onResendVerification={auth.resendVerification}
            onForgotPassword={auth.forgotPassword}
            onResetPassword={async (e, c, p) => {
              const res = await auth.resetPassword(e, c, p);
              if (res.ok) setActiveNav("home");
              return res;
            }}
            language={settings.language}
          />
        );
      case "profile":
        return auth.user ? (
          <ProfileView
            user={auth.user}
            onLogout={() => {
              auth.logout();
              setActiveNav("home");
            }}
            onExport={health.downloadAll}
            medicationCount={health.medications.length}
            appointmentCount={health.appointments.length}
            vitalCount={health.vitals.length}
            recordCount={health.records.length}
            language={settings.language}
          />
        ) : (
          <LoginView
            onLogin={async (e, p) => {
              const res = await auth.login(e, p);
              if (res.ok) setActiveNav("profile");
              return res;
            }}
            onRegister={async (e, p, o) => {
              const res = await auth.register(e, p, o);
              if (res.ok && !res.needsVerification) setActiveNav("profile");
              return res;
            }}
            onVerifyEmail={auth.verifyEmail}
            onResendVerification={auth.resendVerification}
            onForgotPassword={auth.forgotPassword}
            onResetPassword={auth.resetPassword}
            language={settings.language}
          />
        );
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
      <div className="flex h-screen w-full items-center justify-center bg-surface-0">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-brand-gradient flex items-center justify-center animate-pulse shadow-glow">
            <Heart size={24} className="text-white" />
          </div>
          <p className="text-ink-muted font-medium">{t("loading", settings.language)}</p>
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
    <div
      className={`relative flex h-screen-safe w-full font-sans text-ink-base ${textSizeClass}`}
    >
      {/* Sidebar */}
      <Sidebar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        language={settings.language}
        advancedMode={settings.advancedMode}
        isAuthenticated={auth.isAuthenticated}
        username={auth.user?.username}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden pb-14 md:pb-0">
        {/* Top Header — clean, mobile-first, always accessible */}
        <header className="h-14 sm:h-16 bg-surface-1/90 backdrop-blur-xl border-b border-line/50 flex items-center justify-between px-3 sm:px-8 sticky top-0 z-20">
          {/* Mobile logo — larger tap target */}
          <div className="flex items-center gap-2.5 md:hidden">
            <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center text-white shadow-soft">
              <Heart size={16} />
            </div>
            <span className="font-bold text-ink-base tracking-tight text-base">MedOS</span>
          </div>

          <h2 className="hidden md:block font-bold text-lg text-ink-base tracking-tight">
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

          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell
              notifications={notif.notifications}
              count={notif.count}
              onDismiss={notif.dismiss}
              onDismissAll={notif.dismissAll}
            />
            <ThemeToggle />
            <EmergencyCTA
              number={settings.emergencyNumber}
              label={t("emergency_quick_label", settings.language)}
              urgent
            />
          </div>
        </header>

        {/* Dynamic Content Area */}
        <main className="flex-1 flex relative overflow-hidden">
          <div className="flex-1 flex flex-col relative">{renderContent()}</div>
        </main>
      </div>

      {/* Right Panel — context-aware */}
      <RightPanel
        language={settings.language}
        emergencyNumber={settings.emergencyNumber}
        vitals={health.vitals}
        medications={health.medications}
        appointments={health.appointments}
        isMedTaken={health.isMedTaken}
        onNavigate={handleNavigate}
        notificationCount={notif.count}
        onOpenNotifications={() => {}}
      />
    </div>
  );
}
