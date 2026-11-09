import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CreateSessionModal } from '../components/CreateSessionModal';
import {
  Play,
  Clock,
  FileText,
  ArrowRight,
  Shield,
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
  } = useApp();

  const [createOpen, setCreateOpen] = useState(false);

  const primaryResume = resumes.find((r) => r.isPrimary) || resumes[0];

  const totalPracticeMinutes = Math.round(
    sessions.reduce((acc, s) => acc + (s.totalDurationSeconds || 0), 0) / 60
  );

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
              <button onClick={() => setCreateOpen(true)} className="btn btn-primary">
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
        {/* New-session CTA — the wizard opens as the Create session modal */}
        <div id="start-session-card" className="panel space-y-5 p-6 lg:col-span-2 lg:p-7">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <p className="micro mb-1.5">Session builder</p>
              <h2 className="text-base font-semibold text-slate-100">Create interview session</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Details and preferences in one two-step wizard — nothing to configure twice
              </p>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">Free · Unlimited</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { label: 'Details', body: 'Target role & company, grounding resume, interview or meeting.' },
              { label: 'Preferences', body: 'Call language, model, answer format, standing AI instructions.' },
              { label: 'Auto Answer', body: 'Instant answers on detected questions — off means you press Answer.' },
              { label: 'Save transcript', body: 'You decide whether transcript lines are persisted (consent).' },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-slate-800 bg-slate-950 p-3.5">
                <p className="micro mb-1.5">{item.label}</p>
                <p className="text-xs leading-relaxed text-slate-500">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-3 text-xs leading-relaxed text-slate-500">
            <Shield className="h-4 w-4 flex-shrink-0 text-slate-600" />
            <span>
              Answers are grounded strictly in your verified experiences. Never fabricates credentials or employers.
            </span>
          </div>

          <button onClick={() => setCreateOpen(true)} className="btn btn-primary w-full">
            <Play className="h-3.5 w-3.5" /> Create interview session
          </button>
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

      {createOpen && <CreateSessionModal onClose={() => setCreateOpen(false)} />}
    </div>
  );
};
