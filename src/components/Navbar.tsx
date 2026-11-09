import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  Mic,
  MicOff,
  FileText,
  BookOpen,
  ClipboardList,
  CreditCard,
  Shield,
  LayoutDashboard,
  AppWindow,
  Radio,
  Heart,
  LogOut,
  Bot,
} from 'lucide-react';
type TabDef = { id: string; label: string; icon: React.ComponentType<{ className?: string }> };

const DESKTOP_TABS: TabDef[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'studio', label: 'Live Studio', icon: Mic },
  { id: 'mock', label: 'Mock', icon: Bot },
  { id: 'vault', label: 'Resumes', icon: FileText },
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
  { id: 'notes', label: 'Notes', icon: ClipboardList },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'opensource', label: 'Open Source', icon: Heart },
];

/** Flat tab: mono uppercase, emerald text + underline when active. */
const Tab: React.FC<{
  tab: TabDef;
  active: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}> = ({ tab, active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`relative flex h-full items-center gap-1.5 px-3 font-mono text-[10.5px] font-medium uppercase tracking-[0.1em] transition-colors ${
      active ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-200'
    }`}
  >
    {tab.label}
    {children}
    {active && <span aria-hidden="true" className="absolute inset-x-2 -bottom-px h-0.5 bg-emerald-400" />}
  </button>
);

export const Navbar: React.FC = () => {
  const {
    user,
    activeSession,
    activeTab,
    setActiveTab,
    audioState,
    startListening,
    stopListening,
    openHUD,
  } = useApp();
  const { authEnabled, demoMode, signOut } = useAuth();

  const isLive = activeSession?.status === 'active';
  const adminTab: TabDef[] =
    user?.role === 'admin' ? [{ id: 'admin', label: 'Admin', icon: Shield }] : [];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950">
      <div className="flex h-14 items-center justify-between px-4 lg:px-6">
        {/* Brand & live status */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 text-left transition-opacity hover:opacity-80"
          >
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900">
              <span className="font-mono text-[12px] font-semibold text-emerald-400">A/</span>
              {isLive && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400" />
              )}
            </div>
            <div className="flex flex-col leading-none">
              <div className="flex items-center gap-1.5">
                <span className="text-[14px] font-semibold tracking-tight text-slate-100">
                  AskMe<span className="text-emerald-400">Ai</span>
                </span>
                {demoMode && (
                  <span
                    title="No backend connected — data lives in this browser only"
                    className="rounded border border-amber-500/40 bg-amber-500/10 px-1 py-px font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-amber-400"
                  >
                    Demo
                  </span>
                )}
              </div>
              <span className="micro mt-1">Real-time interview assistant</span>
            </div>
          </button>

          {isLive && (
            <div className="hidden items-center gap-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-emerald-400 sm:flex">
              <Radio className="h-3 w-3 animate-pulse" />
              Live · {activeSession?.targetCompany}
            </div>
          )}
        </div>

        {/* Desktop tabs */}
        <nav className="hidden h-full items-stretch xl:flex">
          {[...DESKTOP_TABS, ...adminTab].map((tab) => (
            <Tab
              key={tab.id}
              tab={tab}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.id === 'studio' && isLive && (
                <span className="h-1 w-1 animate-ping rounded-full bg-emerald-400" />
              )}
            </Tab>
          ))}
        </nav>

        {/* Right tools: mic, HUD, desktop, account */}
        <div className="flex items-center gap-2">
          <button
            onClick={audioState.isListening ? stopListening : startListening}
            title={audioState.isListening ? 'Mute microphone' : 'Enable microphone'}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] transition-colors ${
              audioState.isListening
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            {audioState.isListening ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
            <span className="hidden md:inline">{audioState.isListening ? 'Listening' : 'Mic Off'}</span>
          </button>

          <button
            onClick={openHUD}
            title="Launch floating HUD (Cmd/Ctrl + Shift + Space)"
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-slate-400 transition-colors hover:text-slate-200"
          >
            <AppWindow className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden lg:inline">HUD</span>
            <kbd className="hidden 2xl:inline rounded border border-slate-700 bg-slate-800 px-1 py-px text-[9px] font-mono text-slate-500">
              ⌘⇧Space
            </kbd>
          </button>

          {authEnabled && (
            <button
              onClick={() => signOut()}
              title={`Signed in as ${user?.email || 'unknown'} — click to sign out`}
              className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:text-white"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded border border-slate-700 bg-slate-800 text-[10px] font-semibold text-slate-300">
                {(user?.displayName || user?.email || '?').trim().charAt(0).toUpperCase()}
              </span>
              <span className="hidden max-w-[8rem] truncate lg:inline">{user?.displayName || user?.email}</span>
              <LogOut className="h-3.5 w-3.5 text-slate-500" />
            </button>
          )}

          <button
            onClick={() => setActiveTab('opensource')}
            title="100% free & open source under the MIT license"
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-emerald-400 transition-colors hover:bg-emerald-500/15"
          >
            <Heart className="h-3.5 w-3.5 fill-emerald-400" />
            <span className="hidden sm:inline">MIT · Free</span>
            <span className="sm:hidden">MIT</span>
          </button>
        </div>
      </div>

      {/* Mobile sub-navigation */}
      <div className="flex items-stretch overflow-x-auto border-t border-slate-800/80 px-2 xl:hidden">
        {[...DESKTOP_TABS, ...adminTab].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={`${item.id}-mobile`}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] transition-colors ${
                isActive ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
              {isActive && <span aria-hidden="true" className="absolute inset-x-2 bottom-0 h-0.5 bg-emerald-400" />}
            </button>
          );
        })}
      </div>
    </header>
  );
};
