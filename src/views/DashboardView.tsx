import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Play,
  Clock,
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

  const fieldClass =
    'w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 transition-colors focus:border-emerald-500/60 focus:outline-none';

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Welcome banner */}
      <div className="panel relative overflow-hidden p-6 lg:p-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          aria-hidden="true"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Copilot ready
              </span>
              <span className="micro">{subscription?.planTier.toUpperCase()} member</span>
            </div>
            <h1 className="display text-3xl leading-tight text-slate-100 lg:text-4xl">
              Welcome back, {user?.displayName || 'Candidate'}.
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
              Your copilot is primed with your authentic experience from{' '}
              <span className="font-medium text-slate-200">{primaryResume?.fileName || 'your resume'}</span>. Ready to
              stream STAR-structured answers while you talk.
            </p>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2.5">
            {activeSession && activeSession.status === 'active' ? (
              <button onClick={() => setActiveTab('studio')} className="btn btn-primary">
                <Play className="h-3.5 w-3.5" /> Resume live session
              </button>
            ) : (
              <button
                onClick={() => {
                  const el = document.getElementById('start-session-card');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="btn btn-primary"
              >
                <Play className="h-3.5 w-3.5" /> Start new session
              </button>
            )}
            <button onClick={() => setActiveTab('coding')} className="btn btn-ghost">
              <Code2 className="h-3.5 w-3.5" /> Sandbox
            </button>
          </div>
        </div>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: 'Access tier',
            value: '100% Free',
            caption: 'Unlimited sessions, questions & sandboxes',
            action: 'MIT License',
            onAction: () => setActiveTab('opensource'),
            signal: false,
          },
          {
            label: 'Total practice',
            value: `${totalPracticeMinutes}`,
            unit: 'mins',
            caption: `Across ${sessions.length} recorded interview rounds`,
            signal: false,
          },
          {
            label: 'Active resumes',
            value: `${resumes.length}`,
            caption: `Primary: ${primaryResume ? 'verified & indexed' : 'none'}`,
            action: 'Manage',
            onAction: () => setActiveTab('vault'),
            signal: false,
          },
          {
            label: 'Interview score',
            value: '94%',
            caption: 'Top 5% candidate response readiness',
            signal: true,
          },
        ].map((stat) => (
          <div key={stat.label} className="panel space-y-3 p-5">
            <p className="micro">{stat.label}</p>
            <div className="flex items-baseline justify-between gap-2">
              <div className="font-mono text-2xl font-medium text-slate-100 lg:text-3xl">
                {stat.value}
                {stat.unit && <span className="ml-1 text-sm font-normal text-slate-500">{stat.unit}</span>}
              </div>
              {stat.action && (
                <button
                  onClick={stat.onAction}
                  className="font-mono text-[10px] uppercase tracking-[0.08em] text-slate-400 underline decoration-slate-700 underline-offset-4 transition-colors hover:text-slate-200"
                >
                  {stat.action}
                </button>
              )}
            </div>
            <p className={`text-[11px] leading-relaxed ${stat.signal ? 'text-emerald-400' : 'text-slate-500'}`}>
              {stat.caption}
            </p>
          </div>
        ))}
      </div>

      {/* Launch form + resume highlights */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Configure & launch */}
        <div id="start-session-card" className="panel space-y-5 p-6 lg:col-span-2 lg:p-7">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <p className="micro mb-1.5">Session builder</p>
              <h2 className="text-base font-semibold text-slate-100">Configure & launch copilot</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Tailors real-time answer suggestions to your target company
              </p>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">Free · Unlimited</span>
          </div>

          <form onSubmit={handleStartSession} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="micro flex items-center gap-1.5" htmlFor="target-company">
                  <Building2 className="h-3 w-3" /> Target company
                </label>
                <input
                  id="target-company"
                  type="text"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  placeholder="e.g. Google, Stripe, Meta, OpenAI"
                  className={fieldClass}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="micro flex items-center gap-1.5" htmlFor="target-role">
                  <Briefcase className="h-3 w-3" /> Target role
                </label>
                <input
                  id="target-role"
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Staff Software Engineer, Tech Lead"
                  className={fieldClass}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="micro flex items-center gap-1.5" htmlFor="grounding-resume">
                <FileText className="h-3 w-3" /> Grounding resume
              </label>
              <select
                id="grounding-resume"
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className={fieldClass}
              >
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fileName} {r.isPrimary ? '(Primary Profile)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Session mode: interview vs regular call (ParakeetAI parity) */}
              <div className="space-y-1.5">
                <label className="micro flex items-center gap-1.5">
                  <Layers className="h-3 w-3" /> Session mode
                </label>
                <div className="flex gap-2">
                  {(
                    [
                      { id: 'interview', label: 'Interview' },
                      { id: 'meeting', label: 'Regular meeting' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSessionMode(m.id)}
                      aria-pressed={sessionMode === m.id}
                      className={`flex-1 rounded-lg border px-3 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.08em] transition-colors ${
                        sessionMode === m.id
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                          : 'border-slate-800 bg-slate-950 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language for speech recognition + answers */}
              <div className="space-y-1.5">
                <label className="micro flex items-center gap-1.5" htmlFor="interview-language">
                  <Calendar className="h-3 w-3" /> Interview language
                </label>
                <select
                  id="interview-language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className={fieldClass}
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
              <label className="micro flex items-center gap-1.5" htmlFor="copilot-instructions">
                <BookOpen className="h-3 w-3" /> Instructions for the copilot
                <span className="ml-auto font-mono text-[10px] normal-case tracking-normal text-slate-600">
                  {instructions.length}/20000
                </span>
              </label>
              <textarea
                id="copilot-instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value.slice(0, 20000))}
                rows={3}
                placeholder="e.g. Keep answers under 60 seconds. Emphasise distributed systems experience. Use British English. Never mention my current employer."
                className={`${fieldClass} resize-y`}
              />
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-3 text-xs leading-relaxed text-slate-500">
              <Shield className="h-4 w-4 flex-shrink-0 text-slate-600" />
              <span>
                Answers are grounded strictly in your verified experiences. Never fabricates credentials or employers.
              </span>
            </div>

            <button type="submit" disabled={isStarting} className="btn btn-primary w-full">
              {isStarting ? (
                <span>Initializing real-time audio engine…</span>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>Launch live interview studio</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Resume highlights */}
        <div className="panel space-y-4 p-6 lg:p-7">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <p className="micro">Resume highlights</p>
            <button
              onClick={() => setActiveTab('vault')}
              className="flex items-center gap-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-slate-400 transition-colors hover:text-slate-200"
            >
              Vault <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          {primaryResume ? (
            <div className="space-y-4">
              <div>
                <span className="block text-sm font-semibold text-slate-100">
                  {primaryResume.parsedProfile?.name || 'Alex Rivers'}
                </span>
                <span className="mt-0.5 block line-clamp-1 text-xs text-slate-500">
                  {primaryResume.parsedProfile?.headline}
                </span>
              </div>

              <div>
                <p className="micro mb-2">Indexed skills ({primaryResume.parsedProfile?.skills.length || 0})</p>
                <div className="flex flex-wrap gap-1.5">
                  {(primaryResume.parsedProfile?.skills || []).slice(0, 8).map((skill, idx) => (
                    <span
                      key={idx}
                      className="rounded border border-slate-800 bg-slate-950 px-2 py-0.5 text-[10.5px] text-slate-400"
                    >
                      {skill}
                    </span>
                  ))}
                  {(primaryResume.parsedProfile?.skills.length || 0) > 8 && (
                    <span className="px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                      +{(primaryResume.parsedProfile?.skills.length || 0) - 8} more
                    </span>
                  )}
                </div>
              </div>

              <div>
                <p className="micro mb-2">Verified career milestones</p>
                <div className="space-y-2">
                  {(primaryResume.parsedProfile?.experience || []).slice(0, 2).map((exp, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-xs">
                      <div className="flex items-center justify-between font-medium text-slate-200">
                        <span>{exp.role}</span>
                        <span className="text-[10px] text-slate-500">{exp.company}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                        {exp.highlights[0] || 'High impact contributions.'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-8 text-center">
              <FileText className="mx-auto h-7 w-7 text-slate-700" />
              <p className="text-xs text-slate-500">No resumes uploaded yet.</p>
              <button onClick={() => setActiveTab('vault')} className="btn btn-ghost">
                Upload resume
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent sessions */}
      <div className="panel space-y-4 p-6 lg:p-7">
        <div className="flex items-center justify-between">
          <div>
            <p className="micro mb-1.5">Archive</p>
            <h2 className="text-base font-semibold text-slate-100">Recent interview sessions</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Review past transcripts, AI answer accuracy, and synthesis notes
            </p>
          </div>

          <button
            onClick={() => setActiveTab('notes')}
            className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400 transition-colors hover:text-slate-200"
          >
            All notes <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="py-10 text-center font-mono text-[11px] uppercase tracking-[0.1em] text-slate-600">
            No past sessions yet — start your first one above
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
                  <th className="px-3 py-3 font-medium">Company</th>
                  <th className="px-3 py-3 font-medium">Role</th>
                  <th className="px-3 py-3 font-medium">Duration</th>
                  <th className="px-3 py-3 font-medium">Questions</th>
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-slate-400">
                {sessions.map((sess) => (
                  <tr key={sess.id} className="transition-colors hover:bg-slate-800/30">
                    <td className="flex items-center gap-2 px-3 py-3 font-medium text-slate-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                      {sess.targetCompany}
                    </td>
                    <td className="px-3 py-3">{sess.targetRole}</td>
                    <td className="px-3 py-3 font-mono">{Math.round(sess.totalDurationSeconds / 60)}m</td>
                    <td className="px-3 py-3">
                      <span className="rounded border border-slate-800 bg-slate-950 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                        {sess.questionsCount}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {new Date(sess.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => {
                          setActiveTab('notes');
                        }}
                        className="rounded border border-slate-800 bg-slate-950 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-slate-400 transition-colors hover:text-slate-200"
                      >
                        Notes
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
