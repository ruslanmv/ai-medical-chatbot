"use client";

import { useState, useEffect, useRef } from "react";
import {
  MessageCircle,
  Plus,
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
  UserPlus,
  PanelLeftClose,
  PanelLeftOpen,
  Globe,
  HelpCircle,
  Share2,
  Info,
  MapPin,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  UsersRound,
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
  | "family-health"
  | "share"
  | "nearby";

interface SidebarProps {
  activeNav: NavView;
  setActiveNav: (nav: NavView) => void;
  /** Start a brand-new conversation: clears the active thread and shows
   *  the empty chat composer. The single "start a chat" entry point —
   *  there is intentionally no separate Home composer. */
  onNewChat?: () => void;
  language?: SupportedLanguage;
  advancedMode?: boolean;
  isAuthenticated?: boolean;
  username?: string;
  email?: string;
  /** Sign the user out. Wired from MedOSApp (clears the auth token and
   *  returns to the chat surface). Surfaced in the account menu. */
  onLogout?: () => void;
}

const COLLAPSED_KEY = "medos_sidebar_collapsed";

export function Sidebar({
  activeNav,
  setActiveNav,
  onNewChat,
  language = "en",
  isAuthenticated = false,
  username,
  email,
  onLogout,
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

        {/* Main nav.
         *
         * Health-tracker items only render for authenticated users. For
         * logged-out visitors the private routes (Dashboard / Schedule /
         * Medications / Appointments / Vitals / Records / My Medicines /
         * MedOS Family) require saved personal data and would otherwise
         * surface empty or error states. The logged-out shell collapses
         * to: New Chat, History, and the Tools group (Emergency, Nearby,
         * Topics, Share). Sign-in lives in the bottom auth card. */}
        <nav className="flex-1 overflow-y-auto space-y-0.5">
          {/* New Chat — the single entry point for starting a conversation.
              Follows the ChatGPT / Claude / Gemini pattern: one "new chat"
              action, not a separate Home page with its own duplicate
              composer. */}
          <button
            onClick={() => onNewChat?.()}
            title="New Chat"
            className={`w-full flex items-center rounded-xl border border-line/60 bg-surface-1 hover:bg-surface-2 hover:border-brand-500/40 transition-all font-semibold text-ink-base mb-1 ${
              collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
            }`}
          >
            <Plus size={18} strokeWidth={2.5} className="flex-shrink-0 text-brand-500" />
            {!collapsed && <span className="text-sm">New Chat</span>}
          </button>

          {/* History — the way back to a past or in-progress conversation,
              ChatGPT-style: New Chat starts fresh, History reopens. Replaces
              the old standalone "Ask" item, which only duplicated New Chat. */}
          <NavItem icon={Clock} label={t("nav_history", language)} active={activeNav === "history"} onClick={() => setActiveNav("history")} collapsed={collapsed} />

          {isAuthenticated && (
            <>
              {!collapsed && <SectionLabel>{t("nav_health_tracker", language)}</SectionLabel>}
              {collapsed && <div className="my-2 border-t border-line/50" />}

              <NavItem icon={Heart} label={t("nav_dashboard", language)} active={activeNav === "health-dashboard"} onClick={() => setActiveNav("health-dashboard")} collapsed={collapsed} />
              <NavItem icon={Calendar} label={t("nav_schedule", language)} active={activeNav === "schedule"} onClick={() => setActiveNav("schedule")} collapsed={collapsed} />
              <NavItem icon={Pill} label={t("nav_medications", language)} active={activeNav === "medications"} onClick={() => setActiveNav("medications")} collapsed={collapsed} />
              <NavItem icon={Calendar} label={t("nav_appointments", language)} active={activeNav === "appointments"} onClick={() => setActiveNav("appointments")} collapsed={collapsed} />
              <NavItem icon={Activity} label={t("nav_vitals", language)} active={activeNav === "vitals"} onClick={() => setActiveNav("vitals")} collapsed={collapsed} />
              <NavItem icon={FileText} label={t("nav_records", language)} active={activeNav === "records"} onClick={() => setActiveNav("records")} collapsed={collapsed} />
              <NavItem icon={Package} label="My Medicines" active={activeNav === "my-medicines"} onClick={() => setActiveNav("my-medicines")} collapsed={collapsed} />
              <NavItem icon={UsersRound} label="MedOS Family" active={activeNav === "family-health"} onClick={() => setActiveNav("family-health")} collapsed={collapsed} />
            </>
          )}

          {!collapsed && <SectionLabel>{t("nav_tools", language)}</SectionLabel>}
          {collapsed && <div className="my-2 border-t border-line/50" />}

          <NavItem icon={AlertTriangle} label={t("nav_emergency", language)} active={activeNav === "emergency"} onClick={() => setActiveNav("emergency")} urgent collapsed={collapsed} />
          {/* Nearby — find pharmacies, doctors and hospitals near you. Lives in
              Tools (outside the auth gate) so guests and signed-in users alike
              can reach it; the feature needs only device location, no account. */}
          <NavItem icon={MapPin} label="Nearby" active={activeNav === "nearby"} onClick={() => setActiveNav("nearby")} collapsed={collapsed} />
          <NavItem icon={BookOpen} label={t("nav_topics", language)} active={activeNav === "topics"} onClick={() => setActiveNav("topics")} collapsed={collapsed} />
          <NavItem icon={Share2} label="Share" active={activeNav === "share"} onClick={() => setActiveNav("share")} collapsed={collapsed} />
        </nav>

        {/* ============================================================
         * Bottom section.
         *
         * Two very different layouts:
         *   - GUEST:  No hidden menus. A visible Preferences group plus a
         *             single primary "Sign up free" CTA, with Log in as a
         *             secondary link beneath it.
         *   - AUTH'd: Avatar button that pops an upward account menu —
         *             identity, Profile, Settings, Language, Help & support,
         *             and Sign out. Same affordance as ChatGPT / Claude.
         * ============================================================ */}
        <div className="mt-auto pt-3 border-t border-line/50 relative" ref={menuRef}>
          {isAuthenticated ? (
            <>
              {/* Account menu (opens upward) — authenticated only. Focused on
                  the user: identity, account, language, help, sign out. Product,
                  marketing and developer links intentionally live elsewhere
                  (Share in the sidebar Tools; About / Source / Space in
                  Settings) so this stays a clean account menu. */}
              {bottomMenuOpen && !collapsed && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-surface-1 border border-line/60 rounded-2xl shadow-card overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 z-50">
                  {/* Identity header — who am I. */}
                  <div className="flex items-center gap-3 px-3 py-3 border-b border-line/40">
                    <div className="w-9 h-9 rounded-full bg-brand-gradient flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {(username || "U")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink-base truncate">
                        {username || t("nav_profile", language)}
                      </p>
                      {email && email !== username && (
                        <p className="text-[11px] text-ink-subtle truncate">{email}</p>
                      )}
                    </div>
                  </div>

                  <div className="p-2 space-y-0.5">
                    <MenuItem icon={User2} label={t("nav_profile", language)} onClick={() => navTo("profile")} />
                    <MenuItem icon={Settings} label={t("nav_settings", language)} onClick={() => navTo("settings")} />
                    <MenuItem icon={Globe} label={t("settings_language", language)} detail={language.toUpperCase()} onClick={() => navTo("settings")} />
                    <MenuItem icon={HelpCircle} label="Help & support" onClick={() => window.open("https://github.com/ruslanmv/ai-medical-chatbot/issues", "_blank")} />

                    <div className="my-1.5 border-t border-line/40" />

                    <MenuItem icon={LogOut} label="Sign out" danger onClick={() => { setBottomMenuOpen(false); onLogout?.(); }} />
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

                  {/* Single account CTA. The old "Account" group (Log in +
                      Create account) duplicated this button, so it was removed:
                      "Sign up free" is the one primary action, and Log in drops
                      to a secondary text link beneath it. */}
                  <div className="space-y-2">
                    <button
                      onClick={() => navTo("register")}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-brand-gradient text-white text-sm font-semibold shadow-glow hover:opacity-95 active:scale-[0.99] transition-all"
                    >
                      <UserPlus size={16} strokeWidth={2.5} />
                      Sign up free
                    </button>
                    <p className="text-center text-[11px] text-ink-subtle">
                      Already have an account?{" "}
                      <button
                        onClick={() => navTo("login")}
                        className="font-semibold text-brand-600 hover:underline"
                      >
                        Log in
                      </button>
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-1/95 backdrop-blur-xl border-t border-line/60 flex items-center justify-around px-1 z-50 safe-area-bottom">
        <MobileNavButton icon={Plus} label="New Chat" active={false} onClick={() => onNewChat?.()} />
        <MobileNavButton icon={MessageCircle} label={t("nav_ask", language)} active={activeNav === "chat" || activeNav === "home"} onClick={() => setActiveNav("chat")} />
        <MobileNavButton
          icon={Heart}
          label={t("nav_health", language)}
          active={["health-dashboard", "medications", "appointments", "vitals", "records", "schedule", "my-medicines", "family-health"].includes(activeNav)}
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
      <Icon
        size={16}
        className={`flex-shrink-0 ${danger ? "text-danger-500" : "text-ink-subtle"}`}
      />
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
