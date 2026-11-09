import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import {
  Shield,
  Users,
  Settings,
  Activity,
  FileSpreadsheet,
  Zap,
  Lock,
  Search,
  Check,
  AlertTriangle,
  Cpu,
  RefreshCw,
  Code2,
  Laptop,
  Plus,
} from 'lucide-react';
import { AuditLog, AdminSettings, EnrolledUser, UserRole } from '../types';

export const AdminView: React.FC = () => {
  const { user, showToast, setActiveTab, setElectronGuideOpen } = useApp();

  const [activeAdminTab, setAdminTab] = useState<'users' | 'settings' | 'audits'>('users');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [enrolledUsers, setEnrolledUsers] = useState<EnrolledUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [overview, setOverview] = useState<any>(null);

  // Credit adjustment modal
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>('50');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Invite user (invitation-only enrolment)
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('user');
  const [isInviting, setIsInviting] = useState(false);

  // Clear all user data (GDPR / right to be forgotten)
  const [clearDataConfirm, setClearDataConfirm] = useState('');
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);  const loadAdminData = async () => {
    try {
      const [u, e, a, s, o] = await Promise.all([
        api.getAdminUsers(),
        api.getAdminEnrolledUsers(),
        api.getAdminAuditLogs(),
        api.getAdminSettings(),
        api.getAdminOverview(),
      ]);
      setUsersList(u);
      setEnrolledUsers(e);
      setAuditLogs(a);
      setSettings(s);
      setOverview(o);
    } catch (e: any) {
      showToast('Admin data fetch error', 'error');
    }
  };

  const handleCreditAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !adjustmentAmount || !adjustmentReason.trim()) return;

    setIsAdjusting(true);
    try {
      await api.adjustCredits(selectedUser.uid, parseInt(adjustmentAmount, 10), adjustmentReason);
      showToast(`Adjusted credits for ${selectedUser.displayName}`, 'success');
      setSelectedUser(null);
      setAdjustmentReason('');
      await loadAdminData();
    } catch (e: any) {
      showToast('Adjustment failed', 'error');
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      const updated = await api.updateAdminSettings(settings);
      setSettings(updated);
      showToast('Admin system settings saved', 'success');
    } catch (e: any) {
      showToast('Failed to save settings', 'error');
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    try {
      await api.inviteEnrolledUser(inviteEmail.trim(), inviteRole);
      showToast(`Added ${inviteEmail} (${inviteRole}) — they can sign in with Google`, 'success');
      setInviteEmail('');
      setInviteRole('user');
      await loadAdminData();
    } catch (err: any) {
      showToast(err?.message || 'Invitation failed', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevokeUser = async (email: string) => {
    if (!window.confirm(`Remove enrolment for ${email}?`)) return;
    try {
      await api.removeEnrolledUser(email);
      showToast(`Removed enrolment for ${email}`, 'success');
      await loadAdminData();
    } catch (err: any) {
      showToast(err?.message || 'Could not remove enrolment', 'error');
    }
  };

  const handleClearUserData = async () => {
    if (clearDataConfirm !== 'DELETE') {
      showToast('Please type DELETE to confirm', 'error');
      return;
    }
    setIsClearing(true);
    try {
      await api.clearUserData();
      showToast('All your data has been cleared', 'success');
      setClearDataConfirm('');
      await loadAdminData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to clear data', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  if (user?.role !== 'super_admin' && user?.role !== 'admin') {
    return (
      <div className="py-24 text-center space-y-4 max-w-md mx-auto">
        <Lock className="h-12 w-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Access Denied</h2>
        <p className="text-xs text-slate-400">
          This area is restricted to authenticated Super Administrators and Platform Engineers with custom role claims.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl border border-purple-500/30 bg-slate-900/80  ">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">Enterprise Administrative Console</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                SUPER ADMIN
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Role-based access control, credit grants, AI telemetry, and immutable audit logging
            </p>
          </div>
        </div>

        <button
          onClick={loadAdminData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Overview */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Accounts</span>
            <div className="text-2xl font-extrabold text-white font-mono">{overview.totalUsers}</div>
          </div>
          <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Community Tier</span>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono">100% Free</div>
          </div>
          <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Sessions Run</span>
            <div className="text-2xl font-extrabold text-cyan-400 font-mono">{overview.totalSessions}</div>
          </div>
          <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Software License</span>
            <div className="text-2xl font-extrabold text-purple-400 font-mono">MIT Open Source</div>
          </div>
        </div>
      )}

      {/* Quick Tools: Sandbox & Desktop moved here from the global nav */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <p className="micro mb-1">Quick tools</p>
          <h3 className="text-sm font-semibold text-slate-100">Admin shortcuts</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('coding')}
            title="Open coding sandbox"
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-slate-400 transition-colors hover:text-slate-200"
          >
            <Code2 className="h-3.5 w-3.5" /> Sandbox
          </button>
          <button
            onClick={() => setElectronGuideOpen(true)}
            title="Open Electron desktop companion guide"
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-slate-400 transition-colors hover:text-slate-200"
          >
            <Laptop className="h-3.5 w-3.5" /> Desktop
          </button>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setAdminTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeAdminTab === 'users'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="h-4 w-4" />
          User Management ({usersList.length})
        </button>
        <button
          onClick={() => setAdminTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeAdminTab === 'settings'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="h-4 w-4" />
          System & AI Config
        </button>
        <button
          onClick={() => setAdminTab('audits')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeAdminTab === 'audits'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="h-4 w-4" />
          Security Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* Tab: Users Management */}
      {activeAdminTab === 'users' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6  space-y-4">
          {/* Invite new member (invitation-only enrolment) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <p className="micro mb-1">Add user</p>
              <h3 className="text-sm font-semibold text-slate-100">Invite via Google sign-in</h3>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-rose-400">
              Google sign-in only · max two enrolled accounts
            </span>
          </div>

          <form onSubmit={handleInviteUser} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-[0.1em] text-slate-400 font-semibold">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="someone@example.com"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-[12px] text-slate-100 focus:border-emerald-500/60 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-[0.1em] text-slate-400 font-semibold">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-[12px] text-slate-100 focus:border-emerald-500/60 focus:outline-none"
              >
                <option value="user">Member</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isInviting || !inviteEmail.trim()}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isInviting ? 'Adding…' : 'Add User'}
              </button>
            </div>
          </form>

          {/* Enrolled accounts */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <p className="micro mb-1">Enrolled accounts</p>
              <h3 className="text-sm font-semibold text-slate-100">
                Who can sign in ({enrolledUsers.length} enrolled)
              </h3>
            </div>
          </div>

          <div className="space-y-1.5">
            {enrolledUsers.length > 0 ? (
              enrolledUsers.map((eu) => (
                <div
                  key={eu.email}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-slate-300">{eu.email}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                        eu.role === 'super_admin' || eu.role === 'admin'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {eu.role}
                    </span>
                    {eu.provisioned ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> signed in
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">awaiting first sign-in</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRevokeUser(eu.email)}
                    disabled={enrolledUsers.length <= 1}
                    title="Remove enrolment"
                    className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.08em] font-semibold text-rose-400 transition-colors hover:bg-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Revoke
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 text-center py-3">No enrolled accounts yet.</p>
            )}
          </div>

          {/* Danger Zone: Clear all user data */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <p className="micro mb-1">Danger Zone</p>
                <h3 className="text-sm font-semibold text-slate-100">Clear all your data</h3>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              This permanently deletes all your data: sessions, transcripts, answers,
              notes, resumes, documents, devices, wallet, and subscription. This action
              cannot be undone. Your account will remain enrolled but start blank.
            </p>

            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-[0.1em] text-slate-400 font-semibold">
                  Type DELETE to confirm
                </label>
                <input
                  type="text"
                  value={clearDataConfirm}
                  onChange={(e) => setClearDataConfirm(e.target.value)}
                  placeholder="DELETE"
                  className={`w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-[12px] text-slate-100 ${
                    clearDataConfirm === 'DELETE'
                      ? 'border-emerald-500/60 text-emerald-400'
                      : 'border-slate-800 placeholder-slate-600'
                  } focus:border-emerald-500/60 focus:outline-none`}
                />
              </div>
              <button
                onClick={handleClearUserData}
                disabled={isClearing || clearDataConfirm !== 'DELETE'}
                className={`w-full rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.08em] transition-colors ${
                  clearDataConfirm === 'DELETE' && !isClearing
                    ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                    : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isClearing ? 'Clearing…' : 'Clear All My Data'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">User</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Community Access</th>
                  <th className="py-3 px-3 font-mono">Access Status</th>
                  <th className="py-3 px-3">Sessions</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {usersList.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-bold text-white block">{u.displayName}</span>
                      <span className="text-[11px] text-slate-400">{u.email}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 font-mono">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-emerald-400 uppercase font-semibold text-[11px]">
                        Open Source Member
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                      Unlimited Free
                    </td>
                    <td className="py-3 px-3 font-mono">{u.sessionsCount} rounds</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-semibold border border-purple-500/30 transition-colors"
                      >
                        Manage Quota / Role
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: System & AI Config */}
      {activeAdminTab === 'settings' && settings && (
        <form onSubmit={handleSaveSettings} className="rounded-xl border border-slate-800 bg-slate-900/70 p-6  space-y-5 max-w-2xl">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Cpu className="h-4 w-4 text-purple-400" /> Model Selection & Token Controls
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">Active AI Provider</label>
              <input
                type="text"
                value={settings.activeAiProvider}
                disabled
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">Default Model for Real-Time Q&A</label>
              <select
                value={settings.defaultModel}
                onChange={(e) => setSettings({ ...settings, defaultModel: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-emerald-400 font-semibold focus:outline-none"
              >
                <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended: Ultra-fast streaming)</option>
                <option value="gemini-4-argon">gemini-4-argon (Deep reasoning & complex coding)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Billing & Paywall Status</label>
                <div className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-emerald-400 font-semibold">
                  Disabled (100% Free & Open Source)
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Software License Policy</label>
                <div className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-purple-400 font-mono">
                  MIT Permissive License
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-950/80 border border-slate-800">
              <div>
                <span className="text-xs font-bold text-white block">Maintenance Mode</span>
                <span className="text-[11px] text-slate-400">Blocks new live sessions temporarily</span>
              </div>
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                className="h-4 w-4 rounded accent-purple-500 cursor-pointer"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-purple-500 hover:bg-purple-400 text-slate-950 transition-colors "
          >
            Save Global System Settings
          </button>
        </form>
      )}

      {/* Tab: Audit Logs */}
      {activeAdminTab === 'audits' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6  space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Admin</th>
                  <th className="py-3 px-3">Action</th>
                  <th className="py-3 px-3">Details</th>
                  <th className="py-3 px-3 font-mono">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-3 px-3 text-white font-medium">{log.adminEmail}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950/60 text-purple-300 border border-purple-500/30">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{log.details}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Management & Quota Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80  animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6  space-y-4">
            <h3 className="text-base font-bold text-white">
              Manage Member: {selectedUser.displayName}
            </h3>
            <p className="text-xs text-slate-400">
              Community Status: <span className="font-mono text-emerald-400 font-bold">100% Free & Unlimited</span> (Open Source).
            </p>

            <form onSubmit={handleCreditAdjustment} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Administrative Priority Boost</label>
                <input
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Required Audit Note / Reason</label>
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="e.g. VIP community maintainer or core contributor"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjusting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-500 hover:bg-purple-400 text-slate-950"
                >
                  {isAdjusting ? 'Recording Audit...' : 'Confirm Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
