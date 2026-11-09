/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { Navbar } from './components/Navbar';
import { DesktopHUD } from './components/DesktopHUD';
import { ElectronGuideModal } from './components/ElectronGuideModal';
import { DashboardView } from './views/DashboardView';
import { LiveStudioView } from './views/LiveStudioView';
import { MockInterviewView } from './views/MockInterviewView';
import { BillingView } from './views/BillingView';
import { CodingSandboxView } from './views/CodingSandboxView';
import { ResumeVaultView } from './views/ResumeVaultView';
import { KnowledgeBaseView } from './views/KnowledgeBaseView';
import { NotesView } from './views/NotesView';
import { OpenSourceView } from './views/OpenSourceView';
import { AdminView } from './views/AdminView';
import { CheckCircle2, AlertCircle, Info, X, RefreshCw, Compass } from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeTab, toasts, dismissToast, backendError, refreshState } = useApp();
  const { enterDemo } = useAuth();

  // The page was served without the API behind it (static preview, wrong URL,
  // proxy without /api). Explain once instead of failing request by request.
  if (backendError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
        <div className="panel w-full max-w-lg p-8 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400">
            <AlertCircle className="h-5 w-5" />
          </div>
          <p className="micro mb-3">Connection</p>
          <h1 className="display text-2xl">Cannot reach the AskMeAi server</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{backendError}</p>
          <p className="mt-4 text-[12px] text-slate-500">
            This page is being served from{' '}
            <span className="font-mono text-slate-400">{typeof window !== 'undefined' ? window.location.origin : ''}</span>
          </p>
          <div className="mt-6 flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => void refreshState()}
              className="btn btn-primary"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
            <button
              type="button"
              onClick={() => {
                enterDemo();
                void refreshState();
              }}
              className="btn btn-ghost"
            >
              <Compass className="h-3.5 w-3.5" /> Explore the demo instead
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      <Navbar />

      <main className="flex-1 px-4 lg:px-8 py-6">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'studio' && <LiveStudioView />}
        {activeTab === 'mock' && <MockInterviewView />}
        {activeTab === 'coding' && <CodingSandboxView />}
        {activeTab === 'vault' && <ResumeVaultView />}
        {activeTab === 'knowledge' && <KnowledgeBaseView />}
        {activeTab === 'notes' && <NotesView />}
        {activeTab === 'billing' && <BillingView />}
        {activeTab === 'opensource' && <OpenSourceView />}
        {activeTab === 'admin' && <AdminView />}
      </main>

      {/* Global Overlay HUD & Modals */}
      <DesktopHUD />
      <ElectronGuideModal />

      {/* Toast Notification Stack */}
      <div className="pointer-events-none fixed right-5 top-16 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900 p-3.5 text-xs shadow-lg shadow-black/40 animate-in slide-in-from-top-2 duration-150 ${
              toast.type === 'success'
                ? 'border-l-2 border-l-emerald-400'
                : toast.type === 'error'
                  ? 'border-l-2 border-l-rose-400'
                  : 'border-l-2 border-l-slate-400'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-400" />
            ) : (
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
            )}
            <p className="flex-1 font-medium leading-relaxed text-slate-200">{toast.message}</p>
            <button
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="p-0.5 text-slate-500 transition-colors hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const Splash: React.FC = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950">
    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-700 bg-slate-900">
      <span className="font-mono text-base font-semibold text-emerald-400">A/</span>
    </div>
    <div className="h-px w-32 overflow-hidden bg-slate-800">
      <div className="h-full w-1/2 animate-pulse bg-emerald-400" />
    </div>
    <p className="micro">Restoring your session…</p>
  </div>
);

export default function App() {
  const { ready, initializing } = useAuth();

  if (initializing) return <Splash />;
  if (!ready) return <AuthScreen />;

  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
