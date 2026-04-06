"use client";

import { useState, useEffect } from "react";
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
  User2,
  LogIn,
  PanelLeftClose,
  PanelLeftOpen,
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
  | "schedule"
  | "history"
  | "settings"
  | "login"
  | "profile"
  | "ehr-wizard";

interface SidebarProps {
  activeNav: NavView;
  setActiveNav: (nav: NavView) => void;
  language?: SupportedLanguage;
  advancedMode?: boolean;
  isAuthenticated?: boolean;
  username?: string;
}

const COLLAPSED_KEY = "medos_sidebar_collapsed";

export function Sidebar({
  activeNav,
  setActiveNav,
  language = "en",
  isAuthenticated = false,
  username,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Restore collapsed state from localStorage on mount.
  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSED_KEY, String(next));
  };

  return (
    <>
      {/* Desktop sidebar — collapsible */}
      <aside
        className={`hidden md:flex flex-col z-20 bg-surface-1/70 backdrop-blur-xl border-r border-line/60 transition-all duration-300 ease-in-out ${
          collapsed ? "w-[68px] p-2" : "w-64 p-4"
        }`}
      >
        {/* Logo */}
        <div
          className={`flex items-center mb-6 mt-1 ${
            collapsed ? "justify-center px-0" : "gap-3 px-3"
          }`}
        >
          <div
            className={`rounded-2xl bg-brand-gradient flex items-center justify-center text-white shadow-glow flex-shrink-0 ${
              collapsed ? "w-10 h-10" : "w-10 h-10"
            }`}
          >
            <Heart size={20} strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="font-bold text-lg text-ink-base tracking-tight leading-none">
                MedOS
              </h1>
              <p className="text-[10px] font-semibold text-ink-subtle uppercase tracking-[0.14em] mt-1 truncate">
                {t("home_hero_eyebrow", language)}
              </p>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto space-y-0.5">
          <NavItem
            icon={Home}
            label={t("nav_home", language)}
            active={activeNav === "home"}
            onClick={() => setActiveNav("home")}
            collapsed={collapsed}
          />
          <NavItem
            icon={MessageCircle}
            label={t("nav_ask", language)}
            active={activeNav === "chat"}
            onClick={() => setActiveNav("chat")}
            collapsed={collapsed}
          />

          {/* Health Tracker section */}
          {!collapsed && (
            <div className="mt-5 mb-2 px-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-subtle">
                {t("nav_health_tracker", language)}
              </span>
            </div>
          )}
          {collapsed && <div className="my-3 border-t border-line/50" />}

          <NavItem
            icon={Heart}
            label={t("nav_dashboard", language)}
            active={activeNav === "health-dashboard"}
            onClick={() => setActiveNav("health-dashboard")}
            collapsed={collapsed}
          />
          <NavItem
            icon={Calendar}
            label={t("nav_schedule", language)}
            active={activeNav === "schedule"}
            onClick={() => setActiveNav("schedule")}
            collapsed={collapsed}
          />
          <NavItem
            icon={Pill}
            label={t("nav_medications", language)}
            active={activeNav === "medications"}
            onClick={() => setActiveNav("medications")}
            collapsed={collapsed}
          />
          <NavItem
            icon={Calendar}
            label={t("nav_appointments", language)}
            active={activeNav === "appointments"}
            onClick={() => setActiveNav("appointments")}
            collapsed={collapsed}
          />
          <NavItem
            icon={Activity}
            label={t("nav_vitals", language)}
            active={activeNav === "vitals"}
            onClick={() => setActiveNav("vitals")}
            collapsed={collapsed}
          />
          <NavItem
            icon={FileText}
            label={t("nav_records", language)}
            active={activeNav === "records"}
            onClick={() => setActiveNav("records")}
            collapsed={collapsed}
          />

          {/* Tools section */}
          {!collapsed && (
            <div className="mt-5 mb-2 px-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-subtle">
                {t("nav_tools", language)}
              </span>
            </div>
          )}
          {collapsed && <div className="my-3 border-t border-line/50" />}

          <NavItem
            icon={AlertTriangle}
            label={t("nav_emergency", language)}
            active={activeNav === "emergency"}
            onClick={() => setActiveNav("emergency")}
            urgent
            collapsed={collapsed}
          />
          <NavItem
            icon={BookOpen}
            label={t("nav_topics", language)}
            active={activeNav === "topics"}
            onClick={() => setActiveNav("topics")}
            collapsed={collapsed}
          />
          <NavItem
            icon={Clock}
            label={t("nav_history", language)}
            active={activeNav === "history"}
            onClick={() => setActiveNav("history")}
            collapsed={collapsed}
          />

          <div className="my-3 border-t border-line/50" />

          <NavItem
            icon={Settings}
            label={t("nav_settings", language)}
            active={activeNav === "settings"}
            onClick={() => setActiveNav("settings")}
            collapsed={collapsed}
          />
          <NavItem
            icon={isAuthenticated ? User2 : LogIn}
            label={
              isAuthenticated
                ? username || t("nav_profile", language)
                : t("nav_login", language)
            }
            active={activeNav === (isAuthenticated ? "profile" : "login")}
            onClick={() =>
              setActiveNav(isAuthenticated ? "profile" : "login")
            }
            collapsed={collapsed}
          />
        </nav>

        {/* Trust badges — only when expanded */}
        {!collapsed && (
          <div className="mt-3 rounded-2xl bg-surface-2/70 border border-line/50 p-3.5">
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
        )}

        {/* Collapse toggle button — always at the very bottom */}
        <button
          onClick={toggleCollapse}
          className={`mt-3 flex items-center gap-2 rounded-xl text-ink-subtle hover:text-ink-base hover:bg-surface-2 transition-all ${
            collapsed
              ? "justify-center p-2.5"
              : "px-3 py-2.5"
          }`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen size={18} />
          ) : (
            <>
              <PanelLeftClose size={18} />
              <span className="text-xs font-medium">Collapse</span>
            </>
          )}
        </button>
      </aside>

      {/* Mobile bottom navigation — 5 tabs, 48px min touch target */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-1/95 backdrop-blur-xl border-t border-line/60 flex items-center justify-around px-1 z-50 safe-area-bottom">
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
          icon={Heart}
          label={t("nav_health", language)}
          active={
            activeNav === "health-dashboard" ||
            activeNav === "medications" ||
            activeNav === "appointments" ||
            activeNav === "vitals" ||
            activeNav === "records" ||
            activeNav === "schedule"
          }
          onClick={() => setActiveNav("health-dashboard")}
        />
        <MobileNavButton
          icon={AlertTriangle}
          label={t("nav_emergency", language)}
          active={activeNav === "emergency"}
          onClick={() => setActiveNav("emergency")}
          urgent
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
      className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] min-w-[48px] px-2 py-1.5 rounded-2xl transition-all active:scale-95 ${
        active
          ? urgent
            ? "text-danger-500 bg-danger-500/10"
            : "text-brand-600 bg-brand-500/10"
          : "text-ink-subtle"
      }`}
    >
      <Icon
        size={22}
        strokeWidth={active ? 2.5 : 1.75}
        className={urgent && !active ? "text-danger-500/70" : ""}
      />
      <span className="text-[10px] font-semibold leading-none tracking-tight">
        {label}
      </span>
    </button>
  );
}
