import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sparkles,
  Zap,
  Play,
  Clock,
  Award,
  FileText,
  BookOpen,
  ArrowRight,
  Shield,
  Briefcase,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  Code2,
  Heart,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    user,
    wallet,
    subscription,
    resumes,
    documents,
    sessions,
    activeSession,
    setActiveTab,
    startNewSession,
    showToast,
  } = useApp();

  const [targetRole, setTargetRole] = useState('Staff Software Engineer');
  const [targetCompany, setTargetCompany] = useState('Google Cloud');
  const [selectedResumeId, setSelectedResumeId] = useState<string>(
    resumes.find((r) => r.isPrimary)?.id || resumes[0]?.id || ''
  );
  const [sessionMode, setSessionMode] = useState<'interview' | 'meeting'>('interview');
  const [instructions, setInstructions] = useState('');
  const [language, setLanguage] = useState('en-US');
  const [isStarting, setIsStarting] = useState(false);

  const primaryResume = resumes.find((r) => r.isPrimary) || resumes[0];

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRole.trim() || !targetCompany.trim()) {
      showToast('Please specify target role and company', 'error');
      return;
    }

    setIsStarting(true);
    try {
      await startNewSession(targetRole, targetCompany, selectedResumeId, {
        mode: sessionMode,
        instructions: instructions.trim() || undefined,
        language,
      });
    } catch (e: any) {
      showToast(e.message || 'Failed to start session', 'error');
    } finally {
      setIsStarting(false);
    }
  };

  const totalPracticeMinutes = Math.round(
    sessions.reduce((acc, s) => acc + (s.totalDurationSeconds || 0), 0) / 60
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-6 lg:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" /> Copilot Ready
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {subscription?.planTier.toUpperCase()} Member
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.displayName || 'Candidate'}
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Your AI Interview Copilot is primed with your authentic experience from{' '}
              <span className="text-emerald-400 font-semibold">{primaryResume?.fileName || 'your resume'}</span>.
              Ready to provide real-time STAR structured answers and algorithmic hints.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeSession && activeSession.status === 'active' ? (
              <button
                onClick={() => setActiveTab('studio')}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all animate-pulse"
              >
                <Play className="h-4 w-4 fill-slate-950" />
                Resume Live Session
              </button>
            ) : (
              <button
                onClick={() => {
                  const el = document.getElementById('start-session-card');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all"
              >
                <Play className="h-4 w-4 fill-slate-950" />
                Start New Session
              </button>
            )}

            <button
              onClick={() => setActiveTab('coding')}
              className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            >
              <Code2 className="h-4 w-4 text-cyan-400" />
              Coding Sandbox
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Open Source Access */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Access Tier</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <Heart className="h-4 w-4 fill-emerald-400" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl lg:text-3xl font-extrabold text-white">
              100% Free
            </div>
            <button
              onClick={() => setActiveTab('opensource')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline"
            >
              MIT License
            </button>
          </div>
          <p className="text-[11px] text-slate-400">Unlimited sessions, questions, & code sandboxes</p>
        </div>

        {/* Practice Time */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Practice</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-white font-mono">
            {totalPracticeMinutes} <span className="text-base font-normal text-slate-400">mins</span>
          </div>
          <p className="text-[11px] text-slate-400">Across {sessions.length} recorded interview rounds</p>
        </div>

        {/* Connected Resumes */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Resumes</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl lg:text-3xl font-extrabold text-white font-mono">{resumes.length}</div>
            <button
              onClick={() => setActiveTab('vault')}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline"
            >
              Manage
            </button>
          </div>
          <p className="text-[11px] text-slate-400">Primary: {primaryResume ? 'Verified & Indexed' : 'None'}</p>
        </div>

        {/* Practice Readiness */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Interview Score</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-white font-mono">
            94%
          </div>
          <p className="text-[11px] text-emerald-400 font-medium">Top 5% candidate response readiness</p>
        </div>
      </div>

      {/* Main Action Split: Quick Launch + Resume Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Launch New Session Form */}
        <div
          id="start-session-card"
          className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 lg:p-7 shadow-lg space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Configure & Launch Copilot</h2>
                <p className="text-xs text-slate-400">Tailors real-time answer suggestions to your target company</p>
              </div>
            </div>
            <span className="text-xs text-emerald-400 font-mono flex items-center gap-1 font-semibold">
              <Heart className="h-3 w-3 fill-emerald-400" /> Free & Unlimited
            </span>
          </div>

          <form onSubmit={handleStartSession} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-emerald-400" /> Target Company
                </label>
                <input
                  type="text"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  placeholder="e.g. Google, Stripe, Meta, OpenAI"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-cyan-400" /> Target Role
                </label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Staff Software Engineer, Tech Lead"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-amber-400" /> Grounding Resume Profile
              </label>
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              >
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fileName} {r.isPrimary ? '(Primary Profile)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Session mode: interview vs regular call (ParakeetAI parity) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-purple-400" /> Session Mode
                </label>
                <div className="flex gap-2">
                  {(
                    [
                      { id: 'interview', label: 'Interview' },
                      { id: 'meeting', label: 'Regular Meeting' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSessionMode(m.id)}
                      className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                        sessionMode === m.id
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language for speech recognition + answers */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-cyan-400" /> Interview Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="en-US">English</option>
                  <option value="es-ES">Español (Spanish)</option>
                  <option value="fr-FR">Français (French)</option>
                  <option value="de-DE">Deutsch (German)</option>
                  <option value="pt-BR">Português (Portuguese)</option>
                  <option value="hi-IN">हिन्दी (Hindi)</option>
                  <option value="ja-JP">日本語 (Japanese)</option>
                  <option value="ko-KR">한국어 (Korean)</option>
                  <option value="zh-CN">中文 (Chinese)</option>
                  <option value="ar-SA">العربية (Arabic)</option>
                  <option value="it-IT">Italiano (Italian)</option>
                  <option value="id-ID">Bahasa Indonesia</option>
                </select>
              </div>
            </div>

            {/* Standing instructions for every answer (ParakeetAI Instructions field) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-emerald-400" /> Instructions for the Copilot
                <span className="text-[10px] text-slate-500 font-normal">
                  ({instructions.length}/20000) — applied to every answer
                </span>
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value.slice(0, 20000))}
                rows={3}
                placeholder="e.g. Keep answers under 60 seconds. Emphasise distributed systems experience. Use British English. Never mention my current employer."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors resize-y"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 flex items-center gap-3">
              <Shield className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span>
                Answers are grounded strictly in your verified experiences. Never fabricates credentials or employers.
              </span>
            </div>

            <button
              type="submit"
              disabled={isStarting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
            >
              {isStarting ? (
                <span>Initializing Real-Time Audio Engine...</span>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-slate-950" />
                  <span>Launch Live Interview Studio</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Resume & Knowledge Highlights */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 lg:p-7 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-400" /> Resume Highlights
            </h2>
            <button
              onClick={() => setActiveTab('vault')}
              className="text-xs text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              View Vault <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          {primaryResume ? (
            <div className="space-y-3.5">
              <div>
                <span className="text-xs font-bold text-white block">
                  {primaryResume.parsedProfile?.name || 'Alex Rivers'}
                </span>
                <span className="text-xs text-slate-400 block line-clamp-1">
                  {primaryResume.parsedProfile?.headline}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Indexed Skills ({primaryResume.parsedProfile?.skills.length || 0})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(primaryResume.parsedProfile?.skills || []).slice(0, 8).map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700/60"
                    >
                      {skill}
                    </span>
                  ))}
                  {(primaryResume.parsedProfile?.skills.length || 0) > 8 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] text-slate-500">
                      +{(primaryResume.parsedProfile?.skills.length || 0) - 8} more
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Verified Career Milestones
                </span>
                <div className="space-y-2">
                  {(primaryResume.parsedProfile?.experience || []).slice(0, 2).map((exp, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
                      <div className="flex items-center justify-between font-semibold text-slate-200">
                        <span>{exp.role}</span>
                        <span className="text-[10px] text-emerald-400">{exp.company}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {exp.highlights[0] || 'High impact contributions.'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center space-y-2">
              <FileText className="h-8 w-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">No resumes uploaded yet.</p>
              <button
                onClick={() => setActiveTab('vault')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              >
                Upload Resume
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent Sessions Table */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 lg:p-7 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Recent Interview Sessions</h2>
              <p className="text-xs text-slate-400">Review past transcripts, AI answer accuracy, and synthesis notes</p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('notes')}
            className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
          >
            All Notes & Debriefs <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500">
            No past sessions found. Start your first session above!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Target Company</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Duration</th>
                  <th className="py-3 px-3">Questions</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {sessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-semibold text-white flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                      {sess.targetCompany}
                    </td>
                    <td className="py-3 px-3">{sess.targetRole}</td>
                    <td className="py-3 px-3 font-mono">{Math.round(sess.totalDurationSeconds / 60)}m</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px]">
                        {sess.questionsCount} Questions
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {new Date(sess.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          setActiveTab('notes');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold transition-colors text-[11px]"
                      >
                        View Notes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
