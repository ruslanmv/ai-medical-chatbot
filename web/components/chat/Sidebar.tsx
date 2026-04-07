"use client";

import { useState, useEffect, useRef } from "react";
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
  Package,
  Clock,
  User2,
  LogIn,
  LogOut,
  ClipboardList,
  PanelLeftClose,
  PanelLeftOpen,
  Globe,
  HelpCircle,
  Share2,
  Info,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Smartphone,
} from "lucide-react";
import { NavItem } from "./NavItem";
import { AboutModal } from "../ui/AboutModal";
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
  | "ehr-wizard"
  | "my-medicines"
  | "share";

interface SidebarProps {
  activeNav: NavView;
  setActiveNav: (nav: NavView) => void;
  language?: SupportedLanguage;
  advancedMode?: boolean;
  isAuthenticated?: boolean;
  username?: string;
  onLogout?: () => void;
}

const COLLAPSED_KEY = "medos_sidebar_collapsed";

export function Sidebar({
  activeNav,
  setActiveNav,
  language = "en",
  isAuthenticated = false,
  username,
  onLogout,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [bottomMenuOpen, setBottomMenuOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  // Close bottom menu on outside click
  useEffect(() => {
    if (!bottomMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setBottomMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [bottomMenuOpen]);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSED_KEY, String(next));
  };

  const navTo = (view: NavView) => {
    setActiveNav(view);
    setBottomMenuOpen(false);
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col z-20 bg-surface-1/70 backdrop-blur-xl border-r border-line/60 transition-all duration-300 ease-in-out ${
          collapsed ? "w-[68px] p-2" : "w-64 p-4"
        }`}
      >
        {/* Top row: collapse toggle + logo */}
        <div
          className={`flex items-center mb-5 ${
            collapsed ? "flex-col gap-3" : "justify-between"
          }`}
        >
          {/* Collapse toggle — TOP, like ChatGPT/Claude */}
          <button
            onClick={toggleCollapse}
            className="p-2 rounded-xl text-ink-subtle hover:text-ink-base hover:bg-surface-2 transition-all flex-shrink-0"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          {/* Logo */}
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-gradient flex items-center justify-center text-white shadow-glow flex-shrink-0">
                <Heart size={16} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-base text-ink-base tracking-tight leading-none">
                  MedOS
                </h1>
              </div>
            </div>
          )}

          {collapsed && (
            <div className="w-10 h-10 rounded-2xl bg-brand-gradient flex items-center justify-center text-white shadow-glow">
              <Heart size={18} strokeWidth={2.5} />
            </div>
          )}
        </div>

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto space-y-0.5">
          <NavItem icon={Home} label={t("nav_home", language)} active={activeNav === "home"} onClick={() => setActiveNav("home")} collapsed={collapsed} />
          <NavItem icon={MessageCircle} label={t("nav_ask", language)} active={activeNav === "chat"} onClick={() => setActiveNav("chat")} collapsed={collapsed} />

          {!collapsed && <SectionLabel>{t("nav_health_tracker", language)}</SectionLabel>}
          {collapsed && <div className="my-2 border-t border-line/50" />}

          <NavItem icon={Heart} label={t("nav_dashboard", language)} active={activeNav === "health-dashboard"} onClick={() => setActiveNav("health-dashboard")} collapsed={collapsed} />
          <NavItem icon={Calendar} label={t("nav_schedule", language)} active={activeNav === "schedule"} onClick={() => setActiveNav("schedule")} collapsed={collapsed} />
          <NavItem icon={Pill} label={t("nav_medications", language)} active={activeNav === "medications"} onClick={() => setActiveNav("medications")} collapsed={collapsed} />
          <NavItem icon={Calendar} label={t("nav_appointments", language)} active={activeNav === "appointments"} onClick={() => setActiveNav("appointments")} collapsed={collapsed} />
          <NavItem icon={Activity} label={t("nav_vitals", language)} active={activeNav === "vitals"} onClick={() => setActiveNav("vitals")} collapsed={collapsed} />
          <NavItem icon={FileText} label={t("nav_records", language)} active={activeNav === "records"} onClick={() => setActiveNav("records")} collapsed={collapsed} />
          <NavItem icon={Package} label="My Medicines" active={activeNav === "my-medicines"} onClick={() => setActiveNav("my-medicines")} collapsed={collapsed} />

          {!collapsed && <SectionLabel>{t("nav_tools", language)}</SectionLabel>}
          {collapsed && <div className="my-2 border-t border-line/50" />}

          <NavItem icon={AlertTriangle} label={t("nav_emergency", language)} active={activeNav === "emergency"} onClick={() => setActiveNav("emergency")} urgent collapsed={collapsed} />
          <NavItem icon={BookOpen} label={t("nav_topics", language)} active={activeNav === "topics"} onClick={() => setActiveNav("topics")} collapsed={collapsed} />
          <NavItem icon={Share2} label="Share" active={activeNav === "share"} onClick={() => setActiveNav("share")} collapsed={collapsed} />
          <NavItem icon={Clock} label={t("nav_history", language)} active={activeNav === "history"} onClick={() => setActiveNav("history")} collapsed={collapsed} />
        </nav>

        {/* ============================================================
         * Bottom settings drawer — like ChatGPT/Claude/HF Space.
         * Shows user profile + settings menu that pops UP from the bottom.
         * ============================================================ */}
        <div className="mt-auto pt-3 border-t border-line/50 relative" ref={menuRef}>
          {/* Pop-up menu (opens upward) */}
          {bottomMenuOpen && !collapsed && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-surface-1 border border-line/60 rounded-2xl shadow-card overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 z-50">
              <div className="p-2 space-y-0.5">
                {/* Account section — first, most important */}
                {isAuthenticated ? (
                  <>
                    <MenuItem icon={User2} label={t("nav_profile", language)} onClick={() => navTo("profile")} />
                    <MenuItem icon={ClipboardList} label="Health Profile (EHR)" onClick={() => navTo("ehr-wizard")} />
                    <MenuItem icon={LogOut} label="Log out" onClick={() => { setBottomMenuOpen(false); onLogout?.(); }} danger />
                  </>
                ) : (
                  <>
                    <MenuItem icon={LogIn} label="Log in / Create Account" onClick={() => navTo("login")} />
                  </>
                )}

                <div className="my-1.5 border-t border-line/40" />

                <MenuItem icon={Settings} label={t("nav_settings", language)} onClick={() => navTo("settings")} />
                <MenuItem icon={Globe} label={t("settings_language", language)} detail={language.toUpperCase()} onClick={() => navTo("settings")} />
                <MenuItem icon={HelpCircle} label="Get help" onClick={() => window.open("https://github.com/ruslanmv/ai-medical-chatbot/issues", "_blank")} />

                <div className="my-1.5 border-t border-line/40" />

                <MenuItem icon={Smartphone} label="Install as App" onClick={() => {}} />
                <MenuItem icon={Share2} label="Share MedOS" onClick={() => { if (typeof navigator !== "undefined" && navigator.share) navigator.share({ title: "MedOS", url: window.location.origin }); }} />
                <MenuItem icon={Info} label="About MedOS" detail="v1.0" onClick={() => { setBottomMenuOpen(false); setShowAbout(true); }} />

                <div className="my-1.5 border-t border-line/40" />

                <div className="px-3 py-2">
                  <p className="text-[10px] text-ink-subtle leading-snug">
                    MedOS v1.0 · Free & Open Source
                    <br />
                    Zero data retention · {t("badge_private", language)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bottom user section — ChatGPT/Claude pattern */}
          {isAuthenticated ? (
            /* Authenticated: avatar + name + menu toggle */
            <button
              onClick={() => collapsed ? setActiveNav("profile") : setBottomMenuOpen(!bottomMenuOpen)}
              className={`w-full flex items-center rounded-xl transition-all hover:bg-surface-2 ${
                collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
              }`}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-gradient flex items-center justify-center text-white font-bold text-xs">
                {(username || "U")[0].toUpperCase()}
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0 text-left">
                    <span className="text-sm font-medium text-ink-base block truncate">
                      {username || "Account"}
                    </span>
                  </div>
                  <MoreHorizontal size={16} className="text-ink-subtle flex-shrink-0" />
                </>
              )}
            </button>
          ) : (
            /* Guest: clean Sign up / Log in — like ChatGPT */
            collapsed ? (
              <button
                onClick={() => setActiveNav("login")}
                className="w-full flex justify-center p-2.5 rounded-xl text-ink-subtle hover:text-ink-base hover:bg-surface-2 transition-all"
                title="Sign up or log in"
              >
                <User2 size={20} />
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => setActiveNav("login")}
                  className="w-full py-2.5 bg-brand-gradient text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 transition-all"
                >
                  Sign up
                </button>
                <button
                  onClick={() => setActiveNav("login")}
                  className="w-full py-2.5 border border-line/60 text-ink-base rounded-xl font-semibold text-sm hover:bg-surface-2 transition-all"
                >
                  Log in
                </button>
                {/* Settings gear — small, below auth buttons */}
                <button
                  onClick={() => setBottomMenuOpen(!bottomMenuOpen)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-ink-subtle hover:text-ink-base text-xs transition-colors"
                >
                  <MoreHorizontal size={14} />
                </button>
              </div>
            )
          )}
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-1/95 backdrop-blur-xl border-t border-line/60 flex items-center justify-around px-1 z-50 safe-area-bottom">
        <MobileNavButton icon={Home} label={t("nav_home", language)} active={activeNav === "home"} onClick={() => setActiveNav("home")} />
        <MobileNavButton icon={MessageCircle} label={t("nav_ask", language)} active={activeNav === "chat"} onClick={() => setActiveNav("chat")} />
        <MobileNavButton
          icon={Heart}
          label={t("nav_health", language)}
          active={["health-dashboard", "medications", "appointments", "vitals", "records", "schedule", "my-medicines"].includes(activeNav)}
          onClick={() => setActiveNav("health-dashboard")}
        />
        <MobileNavButton icon={AlertTriangle} label={t("nav_emergency", language)} active={activeNav === "emergency"} onClick={() => setActiveNav("emergency")} urgent />
        <MobileNavButton icon={Settings} label={t("nav_settings", language)} active={activeNav === "settings"} onClick={() => setActiveNav("settings")} />
      </div>
      {/* About modal */}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </>
  );
}

// ============================================================
// Sub-components
// ============================================================

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 mb-1.5 px-4">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-subtle">
        {children}
      </span>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  detail,
  shortcut,
  external,
  danger,
  onClick,
}: {
  icon: any;
  label: string;
  detail?: string;
  shortcut?: string;
  external?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        danger
          ? "text-danger-500 hover:bg-danger-500/10"
          : "text-ink-base hover:bg-surface-2"
      }`}
    >
      <Icon size={16} className="text-ink-subtle flex-shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {detail && (
        <span className="text-xs text-ink-subtle">{detail}</span>
      )}
      {shortcut && (
        <kbd className="text-[10px] text-ink-subtle bg-surface-2 border border-line/60 rounded px-1.5 py-0.5 font-mono">
          {shortcut}
        </kbd>
      )}
      {external && <ExternalLink size={12} className="text-ink-subtle" />}
    </button>
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
      <Icon size={22} strokeWidth={active ? 2.5 : 1.75} className={urgent && !active ? "text-danger-500/70" : ""} />
      <span className="text-[10px] font-semibold leading-none tracking-tight">{label}</span>
    </button>
  );
}
