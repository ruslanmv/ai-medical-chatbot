'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Activity,
  Database,
  MessageCircle,
  Shield,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  LogIn,
  Lock,
} from 'lucide-react';

interface Stats {
  totalUsers: number;
  verifiedUsers: number;
  adminUsers: number;
  totalHealthData: number;
  totalChats: number;
  activeSessions: number;
  healthBreakdown: Array<{ type: string; count: number }>;
  registrations: Array<{ day: string; count: number }>;
}

interface UserRow {
  id: string;
  email: string;
  displayName: string | null;
  emailVerified: boolean;
  isAdmin: boolean;
  createdAt: string;
  healthDataCount: number;
  chatHistoryCount: number;
}

/**
 * Admin dashboard — accessible ONLY at /admin on the HuggingFace Space.
 * Not linked from the public UI. Requires admin login.
 */
export default function AdminPage() {
  const [token, setToken] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const headers = useCallback(
    () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }),
    [token],
  );

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/admin/stats', { headers: headers() });
    if (res.ok) setStats(await res.json());
    else if (res.status === 403) { setLoggedIn(false); setToken(''); }
  }, [headers]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) qs.set('search', search);
    const res = await fetch(`/api/admin/users?${qs}`, { headers: headers() });
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
    }
    setLoading(false);
  }, [headers, page, search]);

  useEffect(() => {
    if (!loggedIn) return;
    fetchStats();
    fetchUsers();
  }, [loggedIn, fetchStats, fetchUsers]);

  const handleLogin = async () => {
    setLoginError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) { setLoginError(data.error || 'Login failed'); return; }
    // Verify this user is actually an admin.
    const meRes = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    const me = await meRes.json();
    if (!me.user) { setLoginError('Auth failed'); return; }
    // Check admin flag by trying the admin API.
    const adminCheck = await fetch('/api/admin/stats', {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    if (adminCheck.status === 403) { setLoginError('Not an admin account'); return; }
    setToken(data.token);
    setLoggedIn(true);
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Delete user ${userEmail} and ALL their data?`)) return;
    await fetch(`/api/admin/users?id=${userId}`, { method: 'DELETE', headers: headers() });
    fetchUsers();
    fetchStats();
  };

  // Login screen
  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Lock size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Admin Panel</h1>
            <p className="text-sm text-slate-400 mt-1">MedOS server administration</p>
          </div>
          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-700/50 text-sm text-red-300">
              {loginError}
            </div>
          )}
          <div className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Admin email"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button
              onClick={handleLogin}
              className="w-full py-3 bg-gradient-to-br from-red-500 to-orange-500 text-white rounded-xl font-bold text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              <LogIn size={16} />
              Sign in as Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <h1 className="font-bold text-lg">MedOS Admin</h1>
        </div>
        <button
          onClick={() => { fetchStats(); fetchUsers(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            <Stat icon={Users} label="Total users" value={stats.totalUsers} />
            <Stat icon={Shield} label="Verified" value={stats.verifiedUsers} />
            <Stat icon={Shield} label="Admins" value={stats.adminUsers} color="text-red-400" />
            <Stat icon={Database} label="Health records" value={stats.totalHealthData} />
            <Stat icon={MessageCircle} label="Conversations" value={stats.totalChats} />
            <Stat icon={Activity} label="Active sessions" value={stats.activeSessions} />
          </div>
        )}

        {/* Health data breakdown */}
        {stats && stats.healthBreakdown.length > 0 && (
          <div className="mb-8 p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Health data by type</h3>
            <div className="flex flex-wrap gap-2">
              {stats.healthBreakdown.map((b) => (
                <span key={b.type} className="px-3 py-1.5 rounded-full bg-slate-800 text-sm font-medium text-slate-200">
                  {b.type}: <strong>{b.count}</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* User management */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center gap-3">
            <h2 className="font-bold">Users ({total})</h2>
            <div className="flex-1 relative ml-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by email or name..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500/50"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-center px-4 py-3">Verified</th>
                  <th className="text-center px-4 py-3">Role</th>
                  <th className="text-center px-4 py-3">Health</th>
                  <th className="text-center px-4 py-3">Chats</th>
                  <th className="text-left px-4 py-3">Joined</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-100">{u.displayName || '—'}</div>
                      <div className="text-xs text-slate-400">{u.email}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-bold ${u.emailVerified ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {u.emailVerified ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.isAdmin ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                          ADMIN
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">User</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">{u.healthDataCount}</td>
                    <td className="px-4 py-3 text-center text-slate-300">{u.chatHistoryCount}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!u.isAdmin && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete user"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      {loading ? 'Loading...' : 'No users found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
              <span className="text-xs text-slate-400">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-30"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-30"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color?: string }) {
  return (
    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
      <Icon size={16} className={color || 'text-slate-400'} />
      <div className="text-2xl font-black mt-2">{value.toLocaleString()}</div>
      <div className="text-[11px] text-slate-500 font-semibold">{label}</div>
    </div>
  );
}
