"use client";

import {
  Activity,
  Home,
  MessageCircle,
  AlertTriangle,
  BookOpen,
  Settings,
  Heart,
} from "lucide-react";
import { NavItem } from "./NavItem";
import { t, type SupportedLanguage } from "@/lib/i18n";

export type NavView =
  | "home"
  | "chat"
  | "emergency"
  | "topics"
  | "records"
  | "schedule"
  | "history"
  | "settings";

interface SidebarProps {
  activeNav: NavView;
  setActiveNav: (nav: NavView) => void;
  language?: SupportedLanguage;
  advancedMode?: boolean;
}

export function Sidebar({
  activeNav,
  setActiveNav,
  language = "en",
  advancedMode = false,
}: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-64 bg-white border-r border-slate-100 flex-col p-4 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3 px-4 mb-8 mt-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <Heart size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-800 tracking-tight">
              MedOS
            </h1>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
              {t("home_headline", language)}
            </p>
          </div>
        </div>

        <nav className="flex-1">
          <NavItem
            icon={Home}
            label={t("nav_home", language)}
            active={activeNav === "home"}
            onClick={() => setActiveNav("home")}
          />
          <NavItem
            icon={MessageCircle}
            label={t("nav_ask", language)}
            active={activeNav === "chat"}
            onClick={() => setActiveNav("chat")}
          />
          <NavItem
            icon={AlertTriangle}
            label={t("nav_emergency", language)}
            active={activeNav === "emergency"}
            onClick={() => setActiveNav("emergency")}
            urgent
          />
          <NavItem
            icon={BookOpen}
            label={t("nav_topics", language)}
            active={activeNav === "topics"}
            onClick={() => setActiveNav("topics")}
          />
          <div className="my-4 border-t border-slate-50" />
          <NavItem
            icon={Settings}
            label={t("nav_settings", language)}
            active={activeNav === "settings"}
            onClick={() => setActiveNav("settings")}
          />
        </nav>

        {/* Trust badges at bottom instead of user profile */}
        <div className="mt-auto p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {t("badge_private", language)}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {t("badge_no_signup", language)}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {t("badge_free", language)}
          </div>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around px-2 py-1 z-50 safe-area-bottom">
        <MobileNavButton
          icon={Home}
          label={t("nav_home", language)}
          active={activeNav === "home"}
          onClick={() => setActiveNav("home")}
        />
        <MobileNavButton
          icon={MessageCircle}
          label={t("nav_ask", language)}
          active={activeNav === "chat"}
          onClick={() => setActiveNav("chat")}
        />
        <MobileNavButton
          icon={AlertTriangle}
          label={t("nav_emergency", language)}
          active={activeNav === "emergency"}
          onClick={() => setActiveNav("emergency")}
          urgent
        />
        <MobileNavButton
          icon={BookOpen}
          label={t("nav_topics", language)}
          active={activeNav === "topics"}
          onClick={() => setActiveNav("topics")}
        />
        <MobileNavButton
          icon={Settings}
          label={t("nav_settings", language)}
          active={activeNav === "settings"}
          onClick={() => setActiveNav("settings")}
        />
      </div>
    </>
  );
}

function MobileNavButton({
  icon: Icon,
  label,
  active,
  onClick,
  urgent,
}: {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
  urgent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all min-w-[56px] ${
        active
          ? urgent
            ? "text-red-600"
            : "text-blue-600"
          : "text-slate-400"
      }`}
    >
      <Icon
        size={22}
        strokeWidth={active ? 2.5 : 1.5}
        className={urgent && !active ? "text-red-400" : ""}
      />
      <span className="text-[10px] font-medium leading-tight">{label}</span>
    </button>
  );
}
