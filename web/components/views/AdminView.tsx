"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  MessageCircle,
  Activity,
  Cpu,
  Wifi,
  WifiOff,
  Zap,
  Heart,
  Shield,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  BarChart3,
  Database,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Server,
  Mail,
  Key,
  Save,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import type { SupportedLanguage } from "@/lib/i18n";

interface AdminViewProps {
  language: SupportedLanguage;
  token: string | null;
}

type Tab = "overview" | "users" | "email" | "server" | "llm";

interface PlatformStats {
  totalUsers: number;
  verifiedUsers: number;
  adminUsers: number;
  totalHealthData: number;
  totalChats: number;
  activeSessions: number;
  healthBreakdown: { type: string; count: number }[];
  registrations: { day: string; count: number }[];
}

interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  emailVerified: boolean;
  isAdmin: boolean;
  createdAt: string;
  healthDataCount: number;
  chatHistoryCount: number;
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromEmail: string;
  recoveryEmail: string;
  configured?: boolean;
}

interface ServerConfig {
  smtp: SmtpConfig;
  llm: { defaultPreset: string; ollamaUrl: string; hfDefaultModel: string };
  app: { appUrl: string; allowedOrigins: string };
}

export function AdminView({ language, token }: AdminViewProps) {
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userSearch, setUserSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Password reset state
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [showResetPass, setShowResetPass] = useState(false);

  // Config state
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [configDirty, setConfigDirty] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);

  // LLM health state
  const [llmHealth, setLlmHealth] = useState<{
    models: { model: string; status: string; latencyMs: number; response?: string; error?: string; httpStatus?: number }[];
    summary: { total: number; ok: number; error: number; testedAt?: string };
  } | null>(null);
  const [llmTesting, setLlmTesting] = useState(false);

  const headers = useCallback(() => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const clearMessages = () => { setError(null); setSuccess(null); };

  // ---- Data fetching ----

  const fetchStats = useCallback(async () => {
    setLoading(true); clearMessages();
    try {
      const res = await fetch("/api/proxy/admin/stats", { headers: headers() });
      if (!res.ok) throw new Error(res.status === 403 ? "Admin access required" : "Failed to load stats");
      setStats(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [headers]);

  const fetchUsers = useCallback(async (page = 1, search = "") => {
    setLoading(true); clearMessages();
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/proxy/admin/users?${params}`, { headers: headers() });
      if (!res.ok) throw new Error(res.status === 403 ? "Admin access required" : "Failed to load users");
      const data = await res.json();
      setUsers(data.users);
      setUserTotal(data.total);
      setUserPage(data.page);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [headers]);

  const fetchConfig = useCallback(async () => {
    setLoading(true); clearMessages();
    try {
      const res = await fetch("/api/proxy/admin/config", { headers: headers() });
      if (!res.ok) throw new Error(res.status === 403 ? "Admin access required" : "Failed to load config");
      setConfig(await res.json());
      setConfigDirty(false);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [headers]);

  const fetchLlmHealth = useCallback(async () => {
    setLlmTesting(true); clearMessages();
    try {
      const res = await fetch("/api/proxy/admin/llm-health", { headers: headers() });
      if (!res.ok) throw new Error(res.status === 403 ? "Admin access required" : "Failed to test LLMs");
      setLlmHealth(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLlmTesting(false); }
  }, [headers]);

  // ---- Actions ----

  const deleteUser = async (userId: string) => {
    clearMessages();
    try {
      const res = await fetch(`/api/proxy/admin/users?id=${userId}`, { method: "DELETE", headers: headers() });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Delete failed"); }
      setDeleteConfirm(null);
      setSuccess("User deleted successfully");
      fetchUsers(userPage, userSearch);
    } catch (e: any) { setError(e.message); }
  };

  const handleResetPassword = async () => {
    if (!resetUserId || resetPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    clearMessages();
    try {
      const res = await fetch("/api/proxy/admin/reset-password", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ userId: resetUserId, newPassword: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      setSuccess(data.message || "Password reset successfully");
      setResetUserId(null);
      setResetPassword("");
    } catch (e: any) { setError(e.message); }
  };

  const saveConfig = async () => {
    if (!config) return;
    clearMessages();
    setLoading(true);
    try {
      const res = await fetch("/api/proxy/admin/config", {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setConfig(data.config);
      setConfigDirty(false);
      setSuccess("Configuration saved successfully");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const updateConfig = (section: keyof ServerConfig, field: string, value: any) => {
    if (!config) return;
    setConfig({ ...config, [section]: { ...config[section], [field]: value } });
    setConfigDirty(true);
  };

  // ---- Tab switching ----

  useEffect(() => {
    clearMessages();
    if (tab === "overview") fetchStats();
    else if (tab === "users") fetchUsers(1, userSearch);
    else if (tab === "llm") fetchLlmHealth();
    else if (tab === "email" || tab === "server") fetchConfig();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(userTotal / 20);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 pb-mobile-nav scroll-touch">
      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-ink-base tracking-tight flex items-center gap-2">
              <Shield size={22} className="text-brand-500" />
              Admin Dashboard
            </h2>
            <p className="text-sm text-ink-muted mt-1">Platform management and analytics</p>
          </div>
          <button
            onClick={() => {
              if (tab === "overview") fetchStats();
              else if (tab === "users") fetchUsers(userPage, userSearch);
              else fetchConfig();
            }}
            disabled={loading}
            className="p-2.5 rounded-xl bg-surface-1 border border-line/60 text-ink-muted hover:text-ink-base hover:bg-surface-2 transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 p-1 bg-surface-2/50 border border-line/40 rounded-xl mb-6 overflow-x-auto">
          <TabButton active={tab === "overview"} onClick={() => setTab("overview")} icon={BarChart3} label="Overview" />
          <TabButton active={tab === "users"} onClick={() => setTab("users")} icon={Users} label="Users" />
          <TabButton active={tab === "llm"} onClick={() => setTab("llm")} icon={Cpu} label="LLM" />
          <TabButton active={tab === "email"} onClick={() => setTab("email")} icon={Mail} label="Email" />
          <TabButton active={tab === "server"} onClick={() => setTab("server")} icon={Server} label="Server" />
        </div>

        {/* Status messages */}
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-danger-500/5 border border-danger-500/20 rounded-xl">
            <XCircle size={16} className="text-danger-500 flex-shrink-0" />
            <span className="text-sm text-danger-500 font-medium">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-danger-500/60 hover:text-danger-500">
              <XCircle size={14} />
            </button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-success-500/5 border border-success-500/20 rounded-xl">
            <CheckCircle2 size={16} className="text-success-500 flex-shrink-0" />
            <span className="text-sm text-success-600 font-medium">{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-auto text-success-500/60 hover:text-success-500">
              <XCircle size={14} />
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && !stats && !users.length && !config && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-brand-500" />
          </div>
        )}

        {/* ============================================ */}
        {/* OVERVIEW TAB                                 */}
        {/* ============================================ */}
        {tab === "overview" && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="brand" />
              <StatCard icon={CheckCircle2} label="Verified" value={stats.verifiedUsers} color="success" />
              <StatCard icon={Shield} label="Admins" value={stats.adminUsers} color="warning" />
              <StatCard icon={Database} label="Health Records" value={stats.totalHealthData} color="accent" />
              <StatCard icon={MessageCircle} label="Chat Sessions" value={stats.totalChats} color="brand" />
              <StatCard icon={Activity} label="Active Sessions" value={stats.activeSessions} color="success" />
            </div>

            {stats.healthBreakdown.length > 0 && (
              <AdminCard icon={Heart} title="Health Data Breakdown">
                <div className="space-y-2">
                  {stats.healthBreakdown.map((item) => {
                    const maxCount = Math.max(...stats.healthBreakdown.map((h) => h.count));
                    const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                    return (
                      <div key={item.type} className="flex items-center gap-3">
                        <span className="text-xs text-ink-muted font-medium w-24 truncate capitalize">{item.type}</span>
                        <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-bold text-ink-base w-10 text-right">{item.count}</span>
                      </div>
                    );
                  })}
                </div>
              </AdminCard>
            )}

            {stats.registrations.length > 0 && (
              <AdminCard icon={BarChart3} title="Registrations (Last 30 days)">
                <div className="flex items-end gap-1 h-24">
                  {stats.registrations.map((r) => {
                    const maxR = Math.max(...stats.registrations.map((x) => x.count));
                    const h = maxR > 0 ? (r.count / maxR) * 100 : 0;
                    return (
                      <div key={r.day} className="flex-1 flex flex-col items-center" title={`${r.day}: ${r.count}`}>
                        <div className="w-full bg-brand-500/80 rounded-t min-h-[2px]" style={{ height: `${Math.max(h, 2)}%` }} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-ink-subtle">{stats.registrations[0]?.day?.slice(5)}</span>
                  <span className="text-[10px] text-ink-subtle">{stats.registrations[stats.registrations.length - 1]?.day?.slice(5)}</span>
                </div>
              </AdminCard>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* USERS TAB                                    */}
        {/* ============================================ */}
        {tab === "users" && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" size={16} />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchUsers(1, userSearch)}
                placeholder="Search by email or name..."
                className="w-full bg-surface-1 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 pl-10 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
              />
            </div>

            {/* Password reset modal */}
            {resetUserId && (
              <div className="p-4 bg-warning-500/5 border border-warning-500/20 rounded-xl space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-warning-500" />
                  <span className="font-semibold text-sm text-ink-base">
                    Reset password for: {users.find((u) => u.id === resetUserId)?.email}
                  </span>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showResetPass ? "text" : "password"}
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      placeholder="New password (min 6 chars)"
                      className="w-full bg-surface-1 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                    />
                    <button
                      onClick={() => setShowResetPass(!showResetPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink-base"
                    >
                      {showResetPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button
                    onClick={handleResetPassword}
                    disabled={resetPassword.length < 6}
                    className="px-4 py-2.5 bg-warning-500 text-white rounded-xl font-bold text-sm hover:bg-warning-600 transition-colors disabled:opacity-50"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => { setResetUserId(null); setResetPassword(""); }}
                    className="px-3 py-2.5 bg-surface-2 text-ink-muted rounded-xl text-sm hover:bg-surface-3 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-[11px] text-warning-600">
                  This will invalidate all active sessions for this user. They will need to log in with the new password.
                </p>
              </div>
            )}

            {/* User list */}
            <div className="bg-surface-1 rounded-2xl shadow-soft border border-line/40 overflow-hidden">
              {users.length === 0 && !loading ? (
                <div className="p-8 text-center text-ink-muted text-sm">No users found</div>
              ) : (
                <div className="divide-y divide-line/40">
                  {users.map((u) => (
                    <div key={u.id} className="p-4 flex items-center gap-3 hover:bg-surface-2/30 transition-colors">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${
                        u.isAdmin ? "bg-warning-500" : "bg-brand-500"
                      }`}>
                        {(u.displayName || u.email)[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-ink-base truncate">
                            {u.displayName || u.email}
                          </span>
                          {u.isAdmin && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-warning-500/10 text-warning-600">ADMIN</span>
                          )}
                          {u.emailVerified && <CheckCircle2 size={12} className="text-success-500 flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-ink-muted truncate">{u.email}</span>
                          <span className="text-[10px] text-ink-subtle hidden sm:inline">
                            {u.healthDataCount} records · {u.chatHistoryCount} chats
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Reset password */}
                        <button
                          onClick={() => { setResetUserId(u.id); setResetPassword(""); clearMessages(); }}
                          className="p-2 rounded-lg text-ink-subtle hover:text-warning-500 hover:bg-warning-500/10 transition-colors"
                          title="Reset password"
                        >
                          <Key size={14} />
                        </button>
                        {/* Delete */}
                        {deleteConfirm === u.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => deleteUser(u.id)} className="text-[11px] font-bold text-danger-500 bg-danger-500/10 px-2 py-1.5 rounded-lg">
                              Confirm
                            </button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-[11px] text-ink-muted px-2 py-1.5 rounded-lg hover:bg-surface-2">
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(u.id)}
                            disabled={u.isAdmin}
                            className="p-2 rounded-lg text-ink-subtle hover:text-danger-500 hover:bg-danger-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={u.isAdmin ? "Cannot delete admin" : "Delete user"}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-line/40 bg-surface-2/30">
                  <span className="text-xs text-ink-muted">{userTotal} users · Page {userPage}/{totalPages}</span>
                  <div className="flex gap-1.5">
                    <button onClick={() => fetchUsers(userPage - 1, userSearch)} disabled={userPage <= 1}
                      className="p-1.5 rounded-lg border border-line/60 text-ink-subtle hover:text-ink-base disabled:opacity-30">
                      <ChevronLeft size={14} />
                    </button>
                    <button onClick={() => fetchUsers(userPage + 1, userSearch)} disabled={userPage >= totalPages}
                      className="p-1.5 rounded-lg border border-line/60 text-ink-subtle hover:text-ink-base disabled:opacity-30">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* LLM PROVIDERS TAB                            */}
        {/* ============================================ */}
        {tab === "llm" && (
          <div className="space-y-4">
            {/* Header with test button */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-ink-base text-sm">LLM Provider Health</h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Tests all models in the fallback chain
                </p>
              </div>
              <button
                onClick={fetchLlmHealth}
                disabled={llmTesting}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-xl font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50"
              >
                {llmTesting ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                {llmTesting ? "Testing..." : "Test All Providers"}
              </button>
            </div>

            {/* Summary cards */}
            {llmHealth && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface-1 rounded-2xl shadow-soft border border-line/40 p-4 text-center">
                  <div className="text-2xl font-black text-ink-base">{llmHealth.summary.total}</div>
                  <div className="text-[11px] text-ink-muted font-semibold">Total Models</div>
                </div>
                <div className="bg-surface-1 rounded-2xl shadow-soft border border-success-500/20 p-4 text-center">
                  <div className="text-2xl font-black text-success-500">{llmHealth.summary.ok}</div>
                  <div className="text-[11px] text-success-600 font-semibold">Online</div>
                </div>
                <div className="bg-surface-1 rounded-2xl shadow-soft border border-danger-500/20 p-4 text-center">
                  <div className="text-2xl font-black text-danger-500">{llmHealth.summary.error}</div>
                  <div className="text-[11px] text-danger-600 font-semibold">Offline</div>
                </div>
              </div>
            )}

            {/* Loading */}
            {llmTesting && !llmHealth && (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={24} className="animate-spin text-brand-500" />
                  <p className="text-sm text-ink-muted">Testing {12} models in parallel...</p>
                </div>
              </div>
            )}

            {/* Results table */}
            {llmHealth && (
              <AdminCard icon={Cpu} title={`Provider Status${llmHealth.summary.testedAt ? ` — ${new Date(llmHealth.summary.testedAt).toLocaleTimeString()}` : ""}`}>
                <div className="divide-y divide-line/30">
                  {llmHealth.models.map((m) => (
                    <div key={m.model} className="flex items-center gap-3 py-2.5">
                      {/* Status indicator */}
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        m.status === "ok" ? "bg-success-500" : "bg-danger-500"
                      }`} />
                      {/* Model name */}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-ink-base block truncate">
                          {m.model.split("/").pop()?.replace(":sambanova", " (SambaNova)").replace(":together", " (Together)")}
                        </span>
                        <span className="text-[10px] text-ink-subtle truncate block">
                          {m.model.split("/")[0]}
                        </span>
                      </div>
                      {/* Latency / error */}
                      <div className="flex-shrink-0 text-right">
                        {m.status === "ok" ? (
                          <div>
                            <span className="text-xs font-bold text-success-500">{m.latencyMs}ms</span>
                            {m.response && (
                              <span className="text-[10px] text-ink-subtle block">{m.response}</span>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="text-xs font-bold text-danger-500">
                              {m.httpStatus || "Error"}
                            </span>
                            <span className="text-[10px] text-ink-subtle block truncate max-w-[120px]">
                              {m.error?.slice(0, 40)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </AdminCard>
            )}

            {/* Routing explanation */}
            <AdminCard icon={Activity} title="How Routing Works">
              <div className="space-y-2 text-xs text-ink-muted leading-relaxed">
                <p>When a user sends a message, the system tries models in order:</p>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li><strong>OllaBridge</strong> — custom gateway (if configured)</li>
                  <li><strong>HF Inference</strong> — cascades through all green models above</li>
                  <li><strong>Cached FAQ</strong> — 15 pre-built medical answers (always works)</li>
                </ol>
                <p>If a model returns 429 (rate limit) or 5xx (server error), the next model in the chain is tried automatically. Users never see an error unless all providers are down.</p>
              </div>
            </AdminCard>
          </div>
        )}

        {/* ============================================ */}
        {/* EMAIL (SMTP) TAB                             */}
        {/* ============================================ */}
        {tab === "email" && config && (
          <div className="space-y-4">
            <AdminCard icon={Mail} title="Outgoing Email (SMTP)">
              <div className="space-y-4">
                {/* Status indicator */}
                <div className={`flex items-center gap-2 p-3 rounded-xl border ${
                  config.smtp.configured
                    ? "bg-success-500/5 border-success-500/20"
                    : "bg-warning-500/5 border-warning-500/20"
                }`}>
                  {config.smtp.configured ? (
                    <>
                      <CheckCircle2 size={16} className="text-success-500" />
                      <span className="text-sm text-success-600 font-medium">SMTP configured and active</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={16} className="text-warning-500" />
                      <span className="text-sm text-warning-600 font-medium">SMTP not configured — emails will log to console</span>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ConfigInput label="SMTP Host" value={config.smtp.host} placeholder="smtp.gmail.com"
                    onChange={(v) => updateConfig("smtp", "host", v)} />
                  <ConfigInput label="SMTP Port" value={String(config.smtp.port)} placeholder="587"
                    onChange={(v) => updateConfig("smtp", "port", v)} type="number" />
                  <ConfigInput label="SMTP Username" value={config.smtp.user} placeholder="user@example.com"
                    onChange={(v) => updateConfig("smtp", "user", v)} />
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">SMTP Password</label>
                    <div className="relative">
                      <input
                        type={showSmtpPass ? "text" : "password"}
                        value={config.smtp.pass}
                        onChange={(e) => updateConfig("smtp", "pass", e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-surface-0 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                      />
                      <button onClick={() => setShowSmtpPass(!showSmtpPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink-base">
                        {showSmtpPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                <ConfigInput label="From Email" value={config.smtp.fromEmail} placeholder="MedOS <noreply@medos.health>"
                  onChange={(v) => updateConfig("smtp", "fromEmail", v)} fullWidth />
                <ConfigInput label="Recovery / Support Email" value={config.smtp.recoveryEmail} placeholder="support@medos.health"
                  onChange={(v) => updateConfig("smtp", "recoveryEmail", v)} fullWidth
                  hint="Displayed to users for account recovery and support inquiries" />
              </div>
            </AdminCard>

            {/* Save button */}
            {configDirty && (
              <div className="sticky bottom-20 md:bottom-4 z-10">
                <button onClick={saveConfig} disabled={loading}
                  className="w-full py-3 bg-brand-500 text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  <Save size={16} />
                  {loading ? "Saving..." : "Save Configuration"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* SERVER TAB                                   */}
        {/* ============================================ */}
        {tab === "server" && config && (
          <div className="space-y-4">
            <AdminCard icon={Server} title="LLM Provider Configuration">
              <div className="space-y-4">
                <ConfigInput label="Default Preset" value={config.llm.defaultPreset} placeholder="free-best"
                  onChange={(v) => updateConfig("llm", "defaultPreset", v)}
                  hint="Default AI model preset for new users (free-best, free-fastest, deep-reasoning, local)" />
                <ConfigInput label="Ollama Base URL" value={config.llm.ollamaUrl} placeholder="http://localhost:11434"
                  onChange={(v) => updateConfig("llm", "ollamaUrl", v)}
                  hint="URL for the local Ollama server (used with 'local' preset)" />
                <ConfigInput label="HuggingFace Default Model" value={config.llm.hfDefaultModel}
                  placeholder="meta-llama/Llama-3.3-70B-Instruct"
                  onChange={(v) => updateConfig("llm", "hfDefaultModel", v)}
                  hint="Default model for HuggingFace Inference API" />
              </div>
            </AdminCard>

            <AdminCard icon={Shield} title="Application Settings">
              <div className="space-y-4">
                <ConfigInput label="Application URL" value={config.app.appUrl}
                  placeholder="https://ruslanmv-medibot.hf.space"
                  onChange={(v) => updateConfig("app", "appUrl", v)}
                  hint="Public URL used in email templates and redirects" />
                <ConfigInput label="Allowed Origins (CORS)" value={config.app.allowedOrigins}
                  placeholder="https://your-app.vercel.app,http://localhost:3000"
                  onChange={(v) => updateConfig("app", "allowedOrigins", v)}
                  hint="Comma-separated list of allowed frontend origins" />
              </div>
            </AdminCard>

            <AdminCard icon={Database} title="System Info">
              <div className="space-y-1">
                <InfoRow label="Backend" value={process.env.NEXT_PUBLIC_BACKEND_URL || "HuggingFace Space"} />
                <InfoRow label="Database" value="SQLite (WAL mode)" />
                <InfoRow label="Auth" value="JWT sessions (30-day expiry)" />
                <InfoRow label="Fallback Chain" value="OllaBridge → HF API → Cached FAQ" />
              </div>
            </AdminCard>

            {/* Save button */}
            {configDirty && (
              <div className="sticky bottom-20 md:bottom-4 z-10">
                <button onClick={saveConfig} disabled={loading}
                  className="w-full py-3 bg-brand-500 text-white rounded-xl font-bold text-sm shadow-glow hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  <Save size={16} />
                  {loading ? "Saving..." : "Save Configuration"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
 * Sub-components
 * ============================================================ */

function TabButton({ active, onClick, icon: Icon, label }: {
  active: boolean; onClick: () => void; icon: any; label: string;
}) {
  return (
    <button onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
        active ? "bg-surface-1 text-ink-base shadow-soft" : "text-ink-muted hover:text-ink-base"
      }`}
    >
      <Icon size={15} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: any; label: string; value: number; color: string;
}) {
  const cls: Record<string, string> = {
    brand: "text-brand-500 bg-brand-500/10",
    success: "text-success-500 bg-success-500/10",
    warning: "text-warning-500 bg-warning-500/10",
    accent: "text-accent-500 bg-accent-500/10",
  };
  return (
    <div className="bg-surface-1 rounded-2xl shadow-soft border border-line/40 p-4">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${cls[color] || cls.brand}`}>
        <Icon size={16} />
      </div>
      <div className="text-2xl font-black text-ink-base">{value.toLocaleString()}</div>
      <div className="text-[11px] text-ink-muted font-semibold mt-0.5">{label}</div>
    </div>
  );
}

function AdminCard({ icon: Icon, title, children }: {
  icon: any; title: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-surface-1 rounded-2xl shadow-soft border border-line/40 overflow-hidden">
      <div className="p-4 bg-surface-2/50 border-b border-line/40 flex items-center gap-2">
        <Icon size={16} className="text-brand-500" />
        <h3 className="font-semibold text-ink-base text-sm">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function ConfigInput({ label, value, placeholder, onChange, hint, type = "text", fullWidth }: {
  label: string; value: string; placeholder: string;
  onChange: (v: string) => void; hint?: string; type?: string; fullWidth?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${fullWidth ? "" : ""}`}>
      <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface-0 border border-line/60 text-ink-base rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
      />
      {hint && <p className="text-[11px] text-ink-subtle leading-snug">{hint}</p>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-line/30 last:border-0">
      <span className="text-xs text-ink-muted font-medium">{label}</span>
      <span className="text-xs text-ink-base font-semibold text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
