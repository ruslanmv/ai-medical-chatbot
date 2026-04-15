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
  UserPlus,
  PanelLeftClose,
  PanelLeftOpen,
  Globe,
  HelpCircle,
  Share2,
  Info,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Smartphone,
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
  | "register"
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
  const [bottomMenuOpen, setBottomMenuOpen] = useState(false);
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
         * Bottom section.
         *
         * Two very different layouts:
         *   - GUEST:  No hidden menus. Explicit Account + Preferences
         *             groups with a single primary "Create free account"
         *             CTA. Follows the pattern used by Notion / Slack /
         *             MyFitnessPal on their signed-out shell.
         *   - AUTH'd: Classic avatar button that pops an upward settings
         *             drawer — same affordance users already know from
         *             ChatGPT / Claude.
         * ============================================================ */}
        <div className="mt-auto pt-3 border-t border-line/50 relative" ref={menuRef}>
          {isAuthenticated ? (
            <>
              {/* Pop-up menu (opens upward) — authenticated only. */}
              {bottomMenuOpen && !collapsed && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-surface-1 border border-line/60 rounded-2xl shadow-card overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 z-50">
                  <div className="p-2 space-y-0.5">
                    <MenuItem icon={Settings} label={t("nav_settings", language)} shortcut="Ctrl+," onClick={() => navTo("settings")} />
                    <MenuItem icon={Globe} label={`${t("settings_language", language)}`} detail={language.toUpperCase()} onClick={() => navTo("settings")} />
                    <MenuItem icon={HelpCircle} label="Get help" onClick={() => window.open("https://github.com/ruslanmv/ai-medical-chatbot/issues", "_blank")} />

                    <div className="my-1.5 border-t border-line/40" />

                    <MenuItem icon={Smartphone} label="Install as App" onClick={() => {}} />
                    <MenuItem icon={Share2} label="Share MedOS" onClick={() => { if (navigator.share) navigator.share({ title: "MedOS", url: window.location.origin }); }} />
                    <MenuItem icon={Info} label="About MedOS" detail="v1.0" onClick={() => navTo("settings")} />

                    <div className="my-1.5 border-t border-line/40" />

                    <MenuItem icon={ExternalLink} label="Source Code" onClick={() => window.open("https://github.com/ruslanmv/ai-medical-chatbot", "_blank")} external />
                    <MenuItem icon={ExternalLink} label="HuggingFace Space" onClick={() => window.open("https://huggingface.co/spaces/ruslanmv/MediBot", "_blank")} external />

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

              {/* Profile button — triggers the drawer when expanded,
                  navigates straight to Profile when the sidebar is collapsed. */}
              <button
                onClick={() => {
                  if (collapsed) {
                    setActiveNav("profile");
                  } else {
                    setBottomMenuOpen(!bottomMenuOpen);
                  }
                }}
                className={`w-full flex items-center rounded-xl transition-all hover:bg-surface-2 ${
                  collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
                }`}
              >
                <div
                  className={`flex-shrink-0 rounded-full flex items-center justify-center font-bold text-xs bg-brand-gradient text-white ${
                    collapsed ? "w-9 h-9" : "w-8 h-8"
                  }`}
                >
                  {(username || "U")[0].toUpperCase()}
                </div>

                {!collapsed && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <span className="text-sm font-semibold text-ink-base block truncate">
                        {username || t("nav_profile", language)}
                      </span>
                      <span className="text-[10px] text-ink-subtle block">
                        Account
                      </span>
                    </div>
                    {bottomMenuOpen ? (
                      <ChevronDown size={14} className="text-ink-subtle flex-shrink-0" />
                    ) : (
                      <ChevronUp size={14} className="text-ink-subtle flex-shrink-0" />
                    )}
                  </>
                )}
              </button>
            </>
          ) : (
            /* --------------------------------------------------------
             * GUEST layout — explicit, flat, no hidden menus.
             * -------------------------------------------------------- */
            <div className={collapsed ? "space-y-1" : "space-y-3"}>
              {collapsed ? (
                /* Collapsed: single "Sign in" icon button. */
                <button
                  onClick={() => setActiveNav("login")}
                  className="w-full flex items-center justify-center p-2.5 rounded-xl text-ink-base hover:bg-surface-2 transition-all"
                  title="Log in"
                  aria-label="Log in"
                >
                  <div className="w-9 h-9 rounded-full bg-surface-2 border border-line/60 flex items-center justify-center text-ink-muted">
                    <LogIn size={16} />
                  </div>
                </button>
              ) : (
                <>
                  {/* Account group — Log in + Create account. */}
                  <div>
                    <SectionLabel>Account</SectionLabel>
                    <div className="space-y-0.5">
                      <MenuItem icon={LogIn} label="Log in" onClick={() => navTo("login")} />
                      <MenuItem icon={UserPlus} label="Create account" onClick={() => navTo("register")} />
                    </div>
                  </div>

                  {/* Preferences — visible, not hidden behind an ellipsis. */}
                  <div>
                    <SectionLabel>Preferences</SectionLabel>
                    <div className="space-y-0.5">
                      <MenuItem
                        icon={Settings}
                        label={t("nav_settings", language)}
                        onClick={() => navTo("settings")}
                      />
                      <MenuItem
                        icon={Globe}
                        label={t("settings_language", language)}
                        detail={language.toUpperCase()}
                        onClick={() => navTo("settings")}
                      />
                      <MenuItem
                        icon={HelpCircle}
                        label="Help"
                        onClick={() =>
                          window.open(
                            "https://github.com/ruslanmv/ai-medical-chatbot/issues",
                            "_blank",
                          )
                        }
                      />
                      <MenuItem
                        icon={Info}
                        label="About"
                        detail="v1.0"
                        onClick={() => navTo("settings")}
                      />
                    </div>
                  </div>

                  {/* Primary CTA — single strongest action on the page. */}
                  <button
                    onClick={() => navTo("register")}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-brand-gradient text-white text-sm font-semibold shadow-glow hover:opacity-95 active:scale-[0.99] transition-all"
                  >
                    <UserPlus size={16} strokeWidth={2.5} />
                    Sign up free
                  </button>
                  <p className="text-center text-[10px] text-ink-subtle leading-snug px-2">
                    Sync your health data across devices.
                    <br />
                    You’re browsing as a guest.
                  </p>
                </>
              )}
            </div>
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
  onClick,
}: {
  icon: any;
  label: string;
  detail?: string;
  shortcut?: string;
  external?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink-base hover:bg-surface-2 transition-colors"
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
