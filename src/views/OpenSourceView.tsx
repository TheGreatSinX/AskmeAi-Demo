import React, { useState } from 'react';
import {
  Heart,
  Github,
  Code2,
  Cpu,
  ShieldCheck,
  Sparkles,
  Terminal,
  ExternalLink,
  Check,
  Copy,
  Users,
  Layers,
  BookOpen,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const OpenSourceView: React.FC = () => {
  const { showToast } = useApp();
  const [copiedClone, setCopiedClone] = useState(false);

  const cloneCommand = 'git clone https://github.com/askmeai/askmeai-copilot.git\ncd askmeai-copilot\nnpm install\nnpm run dev';

  const handleCopyClone = () => {
    navigator.clipboard.writeText(cloneCommand);
    setCopiedClone(true);
    showToast('Copied installation commands to clipboard', 'success');
    setTimeout(() => setCopiedClone(false), 2000);
  };

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-slate-900 p-6 lg:p-8 ">

        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <Heart className="h-3 w-3 fill-emerald-400" /> 100% Free & Open Source
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-medium">
              MIT License
            </span>
          </div>

          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            AskMeAi is Free & Open For All
          </h1>
          <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
            We removed all billing, paywalls, and credit deductions. AskMeAi is completely open source under the MIT License, providing every engineer, designer, and candidate with unrestricted access to real-time interview copiloting, resume grounding, and algorithmic sandbox guidance.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleCopyClone}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950   transition-all"
            >
              {copiedClone ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copiedClone ? 'Copied Commands' : 'Clone & Self-Host'}</span>
            </button>

            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            >
              <Github className="h-4 w-4" />
              <span>GitHub Repository</span>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Feature & Freedom Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60  space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-white">Zero Paywalls or Limits</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Run as many interview practice rounds, coding challenge evaluations, and debrief notes as you need. No artificial throttling, pay-per-minute timers, or credit tokens.
          </p>
        </div>

        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60  space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-white">Privacy-First Architecture</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Audio processing is performed locally in browser memory using standard Web Audio & Speech APIs. Candidate documents, transcripts, and notes belong strictly to you.
          </p>
        </div>

        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60  space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Cpu className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-white">Pluggable Model Providers</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Out-of-the-box support for Google Gemini (Flash & Argon), with extensible backends to plug in Ollama, vLLM, DeepSeek, or any OpenAI-compatible API endpoint.
          </p>
        </div>
      </div>

      {/* Self-Hosting Guide */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 lg:p-7  space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Self-Hosting & Quickstart</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Node.js 20+ & TypeScript</span>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-slate-300 leading-relaxed">
            You can run AskMeAi entirely on your local machine or deploy it to Docker, Cloud Run, or any VPS:
          </p>

          <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs text-emerald-300 font-mono overflow-x-auto leading-relaxed">
{`# 1. Clone the repository
git clone https://github.com/askmeai/askmeai-copilot.git
cd askmeai-copilot

# 2. Install dependencies
npm install

# 3. Configure environment (optional custom Gemini key)
cp .env.example .env

# 4. Start full-stack development server
npm run dev
# Running on http://localhost:3000`}
          </pre>
        </div>
      </div>

      {/* Community Contribution Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/70 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Users className="h-4 w-4 text-emerald-400" />
            <span>How to Contribute</span>
          </div>
          <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
            <li>Submit pull requests for new meeting application loopback drivers (Zoom, Teams, Meet).</li>
            <li>Add localized multi-lingual interview response personas (Spanish, French, Mandarin, Hindi).</li>
            <li>Contribute new LeetCode / HackerRank problem templates to the Coding Sandbox.</li>
            <li>Audit security, accessibility (WCAG 2.2 AA), and offline speech-to-text fallbacks.</li>
          </ul>
        </div>

        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/70 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <BookOpen className="h-4 w-4 text-cyan-400" />
            <span>Open Source License</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            AskMeAi is published under the <strong>MIT License</strong>. You are completely free to inspect, modify, fork, distribute, and integrate this software for personal or commercial use without restriction or subscription fees.
          </p>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400">
            SPDX-License-Identifier: MIT • Copyright (c) 2026 AskMeAi Community
          </div>
        </div>
      </div>
    </div>
  );
};
