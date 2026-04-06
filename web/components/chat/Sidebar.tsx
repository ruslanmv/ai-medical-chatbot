"use client";

import {
  Home,
  MessageCircle,
  AlertTriangle,
  BookOpen,
  Settings,
  Heart,
  ShieldCheck,
  Pill,
  Calendar,
  Activity,
  FileText,
  Clock,
} from "lucide-react";
import { NavItem } from "./NavItem";
import { t, type SupportedLanguage } from "@/lib/i18n";

export type NavView =
  | "home"
  | "chat"
  | "emergency"
  | "topics"
  | "records"
  | "medications"
  | "appointments"
  | "vitals"
  | "health-dashboard"
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
}: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar — slight surface tier above backdrop */}
      <aside className="hidden md:flex w-64 flex-col p-4 z-20 bg-surface-1/70 backdrop-blur-xl border-r border-line/60 shadow-[4px_0_32px_rgba(15,23,42,0.05)] dark:shadow-[4px_0_32px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-3 px-3 mb-8 mt-1">
          <div className="w-10 h-10 rounded-2xl bg-brand-gradient flex items-center justify-center text-white shadow-glow">
            <Heart size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-bold text-lg text-ink-base tracking-tight leading-none">
              MedOS
            </h1>
            <p className="text-[10px] font-semibold text-ink-subtle uppercase tracking-[0.14em] mt-1">
              worldwide care
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto">
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

          {/* Health Tracker section */}
          <div className="mt-5 mb-2 px-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-subtle">
              Health Tracker
            </span>
          </div>
          <NavItem
            icon={Heart}
            label="Dashboard"
            active={activeNav === "health-dashboard"}
            onClick={() => setActiveNav("health-dashboard")}
          />
          <NavItem
            icon={Pill}
            label="Medications"
            active={activeNav === "medications"}
            onClick={() => setActiveNav("medications")}
          />
          <NavItem
            icon={Calendar}
            label="Appointments"
            active={activeNav === "appointments"}
            onClick={() => setActiveNav("appointments")}
          />
          <NavItem
            icon={Activity}
            label="Vitals"
            active={activeNav === "vitals"}
            onClick={() => setActiveNav("vitals")}
          />
          <NavItem
            icon={FileText}
            label="Records"
            active={activeNav === "records"}
            onClick={() => setActiveNav("records")}
          />

          {/* Tools section */}
          <div className="mt-5 mb-2 px-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-subtle">
              Tools
            </span>
          </div>
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
          <NavItem
            icon={Clock}
            label="History"
            active={activeNav === "history"}
            onClick={() => setActiveNav("history")}
          />
          <div className="my-3 border-t border-line/50" />
          <NavItem
            icon={Settings}
            label={t("nav_settings", language)}
            active={activeNav === "settings"}
            onClick={() => setActiveNav("settings")}
          />
        </nav>

        {/* Trust badges at bottom */}
        <div className="mt-auto rounded-2xl bg-surface-2/70 border border-line/50 p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-accent-500/15 flex items-center justify-center">
              <ShieldCheck size={14} className="text-accent-500" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              {t("trust_source_chip", language)}
            </span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-ink-subtle leading-snug">
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-success-500" />
              {t("badge_private", language)}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-success-500" />
              {t("badge_no_signup", language)}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-success-500" />
              {t("badge_free", language)}
            </li>
          </ul>
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-1/95 backdrop-blur-xl border-t border-line/60 flex items-center justify-around px-2 py-1 z-50 safe-area-bottom">
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
            ? "text-danger-500"
            : "text-brand-600"
          : "text-ink-subtle"
      }`}
    >
      <Icon
        size={22}
        strokeWidth={active ? 2.5 : 1.75}
        className={urgent && !active ? "text-danger-500/70" : ""}
      />
      <span className="text-[10px] font-semibold leading-tight tracking-tight">
        {label}
      </span>
    </button>
  );
}
