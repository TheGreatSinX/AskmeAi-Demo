/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { DesktopHUD } from './components/DesktopHUD';
import { ElectronGuideModal } from './components/ElectronGuideModal';
import { DashboardView } from './views/DashboardView';
import { LiveStudioView } from './views/LiveStudioView';
import { CodingSandboxView } from './views/CodingSandboxView';
import { ResumeVaultView } from './views/ResumeVaultView';
import { KnowledgeBaseView } from './views/KnowledgeBaseView';
import { NotesView } from './views/NotesView';
import { OpenSourceView } from './views/OpenSourceView';
import { AdminView } from './views/AdminView';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeTab, toasts, dismissToast } = useApp();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      <Navbar />

      <main className="flex-1 px-4 lg:px-8 py-6">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'studio' && <LiveStudioView />}
        {activeTab === 'coding' && <CodingSandboxView />}
        {activeTab === 'vault' && <ResumeVaultView />}
        {activeTab === 'knowledge' && <KnowledgeBaseView />}
        {activeTab === 'notes' && <NotesView />}
        {(activeTab === 'billing' || activeTab === 'opensource') && <OpenSourceView />}
        {activeTab === 'admin' && <AdminView />}
      </main>

      {/* Global Overlay HUD & Modals */}
      <DesktopHUD />
      <ElectronGuideModal />

      {/* Toast Notification Stack */}
      <div className="fixed top-20 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-md animate-in slide-in-from-top-2 duration-150 text-xs ${
              toast.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/40 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-slate-900/95 border-rose-500/40 text-rose-200'
                : 'bg-slate-900/95 border-cyan-500/40 text-cyan-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
            ) : (
              <Info className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            )}
            <p className="flex-1 leading-relaxed font-medium">{toast.message}</p>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-slate-400 hover:text-white p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
