import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Mic,
  MicOff,
  Code2,
  FileText,
  BookOpen,
  ClipboardList,
  CreditCard,
  Shield,
  LayoutDashboard,
  AppWindow,
  Monitor,
  Plus,
  Radio,
  Laptop,
  Heart,
  LogOut,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    user,
    wallet,
    activeSession,
    activeTab,
    setActiveTab,
    audioState,
    startListening,
    stopListening,
    openHUD,
    setRefillModalOpen,
    setElectronGuideOpen,
  } = useApp();
  const { authEnabled, demoMode, signOut } = useAuth();

  const isLive = activeSession?.status === 'active';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Brand & Live Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 font-bold tracking-tight text-white hover:opacity-90 transition-opacity"
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 shadow-md shadow-emerald-500/20">
              <Sparkles className="h-5 w-5 fill-slate-950" />
              {isLive && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold tracking-tight">AskMe<span className="text-emerald-400">Ai</span></span>
                <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                  COPILOT
                </span>
                {demoMode && (
                  <span
                    title="No backend connected — data lives in this browser only"
                    className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30"
                  >
                    DEMO
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Real-Time Interview Assistant</span>
            </div>
          </button>

          {isLive && (
            <div className="hidden sm:flex items-center gap-2 ml-3 px-2.5 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 text-xs font-semibold animate-pulse">
              <Radio className="h-3.5 w-3.5" />
              <span>LIVE: {activeSession?.targetCompany}</span>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden xl:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'dashboard'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab('studio')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all relative ${
              activeTab === 'studio'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Mic className="h-3.5 w-3.5" />
            Live Studio
            {isLive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>}
          </button>

          <button
            onClick={() => setActiveTab('coding')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'coding'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            Coding Sandbox
          </button>

          <button
            onClick={() => setActiveTab('vault')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'vault'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Resumes
          </button>

          <button
            onClick={() => setActiveTab('knowledge')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'knowledge'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Knowledge Base
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'notes'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            AI Notes
          </button>

          <button
            onClick={() => setActiveTab('opensource')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'opensource'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Heart className="h-3.5 w-3.5 fill-emerald-400" />
            Open Source
          </button>

          {user?.role === 'super_admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'admin'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-purple-400 hover:text-purple-300 hover:bg-purple-950/40'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              Admin
            </button>
          )}
        </nav>

        {/* Right Action Tools: Mic, HUD, Wallet, Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Mic toggle */}
          <button
            onClick={audioState.isListening ? stopListening : startListening}
            title={audioState.isListening ? 'Mute Microphone' : 'Enable Microphone Audio'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              audioState.isListening
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 animate-pulse'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {audioState.isListening ? <Mic className="h-3.5 w-3.5 text-emerald-400" /> : <MicOff className="h-3.5 w-3.5" />}
            <span className="hidden md:inline">{audioState.isListening ? 'Listening' : 'Mic Off'}</span>
          </button>

          {/* Floating Desktop HUD Launcher */}
          <button
            onClick={openHUD}
            title="Launch Floating Transparent HUD (Cmd/Ctrl + Shift + Space)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all shadow-sm"
          >
            <AppWindow className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden lg:inline">Floating HUD</span>
            <kbd className="hidden 2xl:inline px-1 py-0.5 text-[9px] bg-slate-800 border border-slate-700 rounded text-slate-400 font-mono">
              ⌘⇧Space
            </kbd>
          </button>

          {/* Desktop Companion Guide (Electron) */}
          <button
            onClick={() => setElectronGuideOpen(true)}
            title="Electron Desktop Companion for Windows & macOS"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all"
          >
            <Laptop className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden xl:inline">Desktop App</span>
          </button>

          {/* Account & Sign Out (Firebase Auth) */}
          {authEnabled && (
            <button
              onClick={() => signOut()}
              title={`Signed in as ${user?.email || 'unknown'} — click to sign out`}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-[10px] font-extrabold text-slate-950">
                {(user?.displayName || user?.email || '?').trim().charAt(0).toUpperCase()}
              </span>
              <span className="hidden lg:inline max-w-[8rem] truncate">{user?.displayName || user?.email}</span>
              <LogOut className="h-3.5 w-3.5 text-slate-400" />
            </button>
          )}

          {/* Open Source Status Badge */}
          <button
            onClick={() => setActiveTab('opensource')}
            title="100% Free & Open Source under MIT License"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-400 text-xs font-semibold transition-all"
          >
            <Heart className="h-3.5 w-3.5 fill-emerald-400" />
            <span className="hidden sm:inline">100% Free & Open Source</span>
            <span className="sm:hidden">Free</span>
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="xl:hidden flex items-center gap-1 px-4 py-2 overflow-x-auto border-t border-slate-800/80 bg-slate-950/80">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'studio', label: 'Live Studio', icon: Mic },
          { id: 'coding', label: 'Coding', icon: Code2 },
          { id: 'vault', label: 'Resumes', icon: FileText },
          { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
          { id: 'notes', label: 'Notes', icon: ClipboardList },
          { id: 'opensource', label: 'Open Source', icon: Heart },
          ...(user?.role === 'super_admin' ? [{ id: 'admin', label: 'Admin', icon: Shield }] : []),
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
