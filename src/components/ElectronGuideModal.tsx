import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Laptop,
  X,
  Copy,
  Check,
  ShieldCheck,
  FileCode,
  Terminal,
  ExternalLink,
} from 'lucide-react';

export const ElectronGuideModal: React.FC = () => {
  const { electronGuideOpen, setElectronGuideOpen, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'main' | 'preload' | 'package'>('main');
  const [copied, setCopied] = useState(false);

  if (!electronGuideOpen) return null;

  const codeSnippets = {
    main: `// electron/main.js - Production Desktop Companion
const { app, BrowserWindow, globalShortcut, ipcMain, desktopCapturer } = require('electron');
const path = require('path');

let mainWindow = null;
let hudWindow = null;

function createHUDWindow() {
  hudWindow = new BrowserWindow({
    width: 440,
    height: 600,
    frame: false,
    transparent: true,
    alwaysOnTop: true, // Always sits on top of Zoom/Meet/Teams
    skipTaskbar: false,
    resizable: true,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  hudWindow.loadURL(appUrl);

  // Global Hotkey: Cmd/Ctrl + Shift + Space
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (hudWindow.isVisible()) {
      hudWindow.hide();
    } else {
      hudWindow.show();
    }
  });
}

app.whenReady().then(createHUDWindow);

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});`,
    preload: `// electron/preload.js - Secure Isolated IPC Bridge
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  toggleAlwaysOnTop: (enable) => ipcRenderer.send('toggle-always-on-top', enable),
  getAudioSources: () => ipcRenderer.invoke('get-system-audio-sources'),
  onShortcutTriggered: (callback) => ipcRenderer.on('shortcut-trigger', callback),
});`,
    package: `{
  "name": "askmeai-desktop-companion",
  "version": "1.0.0",
  "description": "Native Electron Desktop HUD for AskMeAi Copilot",
  "main": "electron/main.js",
  "scripts": {
    "start": "electron .",
    "package:mac": "electron-builder --mac",
    "package:win": "electron-builder --win"
  },
  "devDependencies": {
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0"
  }
}`,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippets[activeTab]);
    setCopied(true);
    showToast('Copied code to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80  animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-lg border border-slate-800 bg-slate-900 p-6  flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Laptop className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Electron Desktop Companion</h2>
              <p className="text-xs text-slate-400">
                Native Windows & macOS build with system-level always-on-top HUD
              </p>
            </div>
          </div>
          <button
            onClick={() => setElectronGuideOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 overflow-y-auto pr-1">
          {/* Architecture Callout */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <ShieldCheck className="h-4 w-4" />
              <span>Legitimate Transparency & Sandboxed IPC</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              The companion runs as a sandboxed Electron application with Context Isolation enabled. It enables system audio loopback capture (for Zoom, Meet, and Teams audio) and registers global keyboard shortcuts (<kbd className="px-1 py-0.5 rounded bg-slate-800 font-mono text-emerald-300">Cmd/Ctrl + Shift + Space</kbd>) to instantly toggle the floating assistant over your meeting window.
            </p>
          </div>

          {/* Code Viewer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                {(['main', 'preload', 'package'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded text-xs font-semibold capitalize transition-all ${
                      activeTab === tab
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab === 'package' ? 'package.json' : `${tab}.js`}
                  </button>
                ))}
              </div>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 text-xs text-amber-200/90 font-mono overflow-x-auto max-h-60 leading-relaxed">
              {codeSnippets[activeTab]}
            </pre>
          </div>

          {/* Run Instructions */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1.5">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-emerald-400" /> Quick Launch Steps:
            </span>
            <ol className="list-decimal list-inside text-slate-400 space-y-1">
              <li>Save files to an <code className="text-slate-200 font-mono">electron/</code> directory.</li>
              <li>Run <code className="text-emerald-400 font-mono">npm install electron electron-builder -D</code>.</li>
              <li>Launch via <code className="text-emerald-400 font-mono">npx electron .</code> to open the native floating HUD.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
