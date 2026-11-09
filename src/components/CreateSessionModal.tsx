import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Globe,
  Cpu,
  Settings,
  MessageSquare,
  Zap,
  Save,
  Building2,
  Briefcase,
  FileText,
  Layers,
  Plus,
  ArrowLeft,
  ArrowRight,
  Play,
  ClipboardList,
} from 'lucide-react';
import { AnswerStyle } from '../types';

const LANGUAGES = [
  { value: 'en-US', label: 'English' },
  { value: 'es-ES', label: 'Español (Spanish)' },
  { value: 'fr-FR', label: 'Français (French)' },
  { value: 'de-DE', label: 'Deutsch (German)' },
  { value: 'pt-BR', label: 'Português (Portuguese)' },
  { value: 'hi-IN', label: 'हिन्दी (Hindi)' },
  { value: 'ja-JP', label: '日本語 (Japanese)' },
  { value: 'ko-KR', label: '한국어 (Korean)' },
  { value: 'zh-CN', label: '中文 (Chinese)' },
  { value: 'ar-SA', label: 'العربية (Arabic)' },
  { value: 'it-IT', label: 'Italiano (Italian)' },
  { value: 'id-ID', label: 'Bahasa Indonesia' },
];

const ANSWER_STYLES: { id: AnswerStyle; label: string }[] = [
  { id: 'star', label: 'STAR Format' },
  { id: 'concise', label: 'Concise Pitch' },
  { id: 'technical', label: 'Deep Technical' },
  { id: 'step_by_step', label: 'Step-by-Step' },
  { id: 'bullets', label: 'Bullets' },
  { id: 'full_script', label: 'Full Script' },
];

const rowClass = 'flex items-center justify-between gap-4 border-b border-slate-800 py-4 last:border-b-0';

/** One wizard row: icon + label/description on the left, control on the right. */
const Row: React.FC<{
  icon: React.ReactNode;
  label: string;
  description: React.ReactNode;
  children: React.ReactNode;
}> = ({ icon, label, description, children }) => (
  <div className={rowClass}>
    <div className="flex min-w-0 items-start gap-3">
      <span className="mt-px text-slate-600">{icon}</span>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-slate-200">{label}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{description}</p>
      </div>
    </div>
    <div className="flex flex-shrink-0 items-center gap-2">{children}</div>
  </div>
);

/** Flat hairline toggle — emerald = on (signal), ink = off. */
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({
  checked,
  onChange,
  label,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`relative h-5 w-9 flex-shrink-0 rounded-full border transition-colors ${
      checked ? 'border-emerald-500/50 bg-emerald-400' : 'border-slate-700 bg-slate-800'
    }`}
  >
    <span
      className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-all ${
        checked ? 'left-[1.05rem] bg-[#052e1c]' : 'left-px bg-slate-500'
      }`}
    />
  </button>
);

const fieldClass =
  'rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-[13px] text-slate-100 placeholder-slate-600 transition-colors focus:border-emerald-500/60 focus:outline-none';

interface Props {
  onClose: () => void;
}

export const CreateSessionModal: React.FC<Props> = ({ onClose }) => {
  const { resumes, startNewSession, aiModels, setActiveTab } = useApp();

  const [step, setStep] = useState<1 | 2>(1);
  const [view, setView] = useState<'form' | 'tutorial'>('form');

  // Step 1 — Details
  const [targetCompany, setTargetCompany] = useState('Google Cloud');
  const [targetRole, setTargetRole] = useState('Staff Software Engineer');
  const [resumeId, setResumeId] = useState<string>(
    resumes.find((r) => r.isPrimary)?.id || resumes[0]?.id || ''
  );
  const [mode, setMode] = useState<'interview' | 'meeting'>('interview');

  // Step 2 — Preferences
  const [language, setLanguage] = useState('en-US');
  const [model, setModel] = useState<string>(aiModels[0] || 'gemini-3.5-flash');
  const [answerStyle, setAnswerStyle] = useState<AnswerStyle>('star');
  const [styleOpen, setStyleOpen] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [autoAnswer, setAutoAnswer] = useState(true);
  const [saveTranscript, setSaveTranscript] = useState(true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step1Valid = targetCompany.trim().length > 0 && targetRole.trim().length > 0;
  const styleLabel = ANSWER_STYLES.find((s) => s.id === answerStyle)?.label || 'STAR Format';

  // Escape closes; background stays locked while the wizard is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const handleCreate = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await startNewSession(targetRole.trim(), targetCompany.trim(), resumeId, {
        mode,
        instructions: instructions.trim() || undefined,
        language,
        answerStyle,
        autoAnswer,
        saveTranscript,
        model,
      });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to create session');
    } finally {
      setBusy(false);
    }
  };

  const StepMarker: React.FC<{ n: 1 | 2; label: string }> = ({ n, label }) => {
    const active = step === n && view === 'form';
    const done = step > n || (view === 'tutorial' && n === 1);
    return (
      <button
        type="button"
        onClick={() => {
          if (n === 1 || step1Valid) {
            setView('form');
            setStep(n);
          }
        }}
        className="group flex items-center gap-3 text-left"
      >
        <span
          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border font-mono text-[10px] font-semibold transition-colors ${
            active
              ? 'border-emerald-400 bg-emerald-400 text-[#052e1c]'
              : done
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                : 'border-slate-700 text-slate-500 group-hover:border-slate-600'
          }`}
        >
          {n}
        </span>
        <span
          className={`text-[13px] font-medium ${
            active ? 'text-slate-100' : 'text-slate-500 group-hover:text-slate-300'
          }`}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Create session"
    >
      <div className="panel relative grid max-h-[92vh] w-full max-w-3xl grid-cols-1 overflow-hidden lg:grid-cols-[15.5rem_1fr]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>

        {/* ── Left rail: title, steps, utility actions ─────────────────── */}
        <aside className="flex flex-col border-b border-slate-800 p-6 lg:border-b-0 lg:border-r">
          <p className="text-[15px] font-semibold text-slate-100">Create session</p>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
            Enter the details &amp; select what you need for this call.
          </p>

          <div className="relative mt-7 space-y-5">
            <span
              aria-hidden="true"
              className="absolute left-3 top-3 h-[calc(100%-1.5rem)] w-px bg-slate-800"
            />
            <div className="relative">
              <StepMarker n={1} label="Details" />
            </div>
            <div className="relative">
              <StepMarker n={2} label="Preferences" />
            </div>
          </div>

          <div className="mt-auto hidden space-y-2 pt-8 lg:block">
            <button
              type="button"
              onClick={() => setView(view === 'tutorial' ? 'form' : 'tutorial')}
              className="btn btn-ghost w-full justify-start"
            >
              <Play className="h-3.5 w-3.5" /> {view === 'tutorial' ? 'Back to form' : 'View tutorial'}
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                setActiveTab('mock');
              }}
              className="btn btn-ghost w-full justify-start"
            >
              <ClipboardList className="h-3.5 w-3.5" /> Mock presets
            </button>
          </div>
        </aside>

        {/* ── Right pane ───────────────────────────────────────────────── */}
        <div className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 lg:pr-10">
            {view === 'tutorial' ? (
              <div className="space-y-5">
                <p className="micro">Tutorial</p>
                <h2 className="display text-2xl text-slate-100">How a session works.</h2>
                <ol className="space-y-4">
                  {[
                    {
                      n: '01',
                      t: 'Details decide the framing',
                      d: 'Target role and company steer every answer; the grounding resume keeps them truthful to your real experience.',
                    },
                    {
                      n: '02',
                      t: 'Preferences tune the copilot',
                      d: 'Pick the call language (speech + answers), the model, the answer format, and standing AI instructions.',
                    },
                    {
                      n: '03',
                      t: 'Extra controls privacy & pace',
                      d: 'Auto Answer answers detected questions instantly; off means you press Answer yourself. Save transcript off keeps lines in memory only.',
                    },
                    {
                      n: '04',
                      t: 'Live Studio runs the call',
                      d: 'Transcripts stream on the left, grounded answers on the right — screenshot/photo answers and manual questions included.',
                    },
                  ].map((item) => (
                    <li key={item.n} className="flex gap-4 border-b border-slate-800 pb-4 last:border-b-0">
                      <span className="font-mono text-[11px] leading-6 text-slate-600">{item.n}</span>
                      <div>
                        <p className="text-[13px] font-medium text-slate-200">{item.t}</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.d}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <button
                  type="button"
                  onClick={() => setView('form')}
                  className="btn btn-ghost"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to the form
                </button>
              </div>
            ) : step === 1 ? (
              /* ── Step 1: Details ─────────────────────────────────────── */
              <div className="space-y-6">
                <div>
                  <p className="micro mb-1">Details</p>
                  <h2 className="text-base font-semibold text-slate-100">What are you preparing for?</h2>
                </div>

                <div className="border-y border-slate-800">
                  <Row
                    icon={<Building2 className="h-4 w-4" />}
                    label="Target company"
                    description="The interviewer your answers are tuned for"
                  >
                    <input
                      type="text"
                      value={targetCompany}
                      onChange={(e) => setTargetCompany(e.target.value)}
                      placeholder="e.g. Google, Stripe, Meta"
                      aria-label="Target company"
                      className={`${fieldClass} w-48`}
                    />
                  </Row>
                  <Row
                    icon={<Briefcase className="h-4 w-4" />}
                    label="Target role"
                    description="The bar your talking points are written to"
                  >
                    <input
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="e.g. Staff Software Engineer"
                      aria-label="Target role"
                      className={`${fieldClass} w-48`}
                    />
                  </Row>
                  <Row
                    icon={<FileText className="h-4 w-4" />}
                    label="Grounding resume"
                    description="Answers stay strictly inside this profile"
                  >
                    <select
                      value={resumeId}
                      onChange={(e) => setResumeId(e.target.value)}
                      aria-label="Grounding resume"
                      className={`${fieldClass} w-48`}
                    >
                      {resumes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.fileName}
                          {r.isPrimary ? ' · primary' : ''}
                        </option>
                      ))}
                    </select>
                  </Row>
                  <Row
                    icon={<Layers className="h-4 w-4" />}
                    label="Session type"
                    description="Interview framing or a regular meeting"
                  >
                    <div className="flex gap-1.5">
                      {(
                        [
                          { id: 'interview', label: 'Interview' },
                          { id: 'meeting', label: 'Meeting' },
                        ] as const
                      ).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setMode(m.id)}
                          aria-pressed={mode === m.id}
                          className={`rounded-lg border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] transition-colors ${
                            mode === m.id
                              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                              : 'border-slate-800 bg-slate-950 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </Row>
                </div>
              </div>
            ) : (
              /* ── Step 2: Preferences ─────────────────────────────────── */
              <div className="space-y-6">
                <div>
                  <p className="micro mb-1">Preferences</p>
                  <h2 className="text-base font-semibold text-slate-100">How should the copilot behave?</h2>
                </div>

                <div>
                  <p className="micro mb-1">Session</p>
                  <div className="border-y border-slate-800">
                    <Row
                      icon={<Globe className="h-4 w-4" />}
                      label="Select language"
                      description="Call language — speech recognition and answer language"
                    >
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        aria-label="Select language"
                        className={`${fieldClass} w-44`}
                      >
                        {LANGUAGES.map((l) => (
                          <option key={l.value} value={l.value}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                    </Row>

                    <Row
                      icon={<Cpu className="h-4 w-4" />}
                      label="Select model"
                      description="Speed and accuracy"
                    >
                      <select
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        aria-label="Select model"
                        className={`${fieldClass} w-48 font-mono text-[12px]`}
                      >
                        {(aiModels.length ? aiModels : ['gemini-3.5-flash']).map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </Row>

                    <Row
                      icon={<Settings className="h-4 w-4" />}
                      label="Answer preferences"
                      description={
                        <>
                          Answer style and format — <span className="text-slate-400">{styleLabel}</span>
                        </>
                      }
                    >
                      <button
                        type="button"
                        onClick={() => setStyleOpen((v) => !v)}
                        aria-expanded={styleOpen}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-slate-400 transition-colors hover:text-slate-200"
                      >
                        <Settings className="h-3.5 w-3.5" /> {styleOpen ? 'Done' : 'Configure'}
                      </button>
                    </Row>
                    {styleOpen && (
                      <div className="flex flex-wrap gap-1.5 border-b border-slate-800 py-4">
                        {ANSWER_STYLES.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setAnswerStyle(s.id)}
                            aria-pressed={answerStyle === s.id}
                            className={`rounded-lg border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.06em] transition-colors ${
                              answerStyle === s.id
                                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                                : 'border-slate-800 bg-slate-950 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    )}

                    <Row
                      icon={<MessageSquare className="h-4 w-4" />}
                      label="AI instructions"
                      description={
                        instructions.trim()
                          ? `Added — ${instructions.trim().slice(0, 60)}${instructions.trim().length > 60 ? '…' : ''}`
                          : 'Additional guidance applied to every answer'
                      }
                    >
                      <button
                        type="button"
                        onClick={() => setInstructionsOpen((v) => !v)}
                        aria-expanded={instructionsOpen}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-slate-400 transition-colors hover:text-slate-200"
                      >
                        {instructionsOpen ? 'Done' : <><Plus className="h-3.5 w-3.5" /> Add</>}
                      </button>
                    </Row>
                    {instructionsOpen && (
                      <div className="space-y-2 border-b border-slate-800 py-4">
                        <textarea
                          value={instructions}
                          onChange={(e) => setInstructions(e.target.value.slice(0, 20000))}
                          rows={4}
                          placeholder="e.g. Keep answers under 60 seconds. Use British English. Never mention my current employer."
                          aria-label="AI instructions"
                          className={`${fieldClass} w-full resize-y leading-relaxed`}
                        />
                        <p className="text-right font-mono text-[10px] text-slate-600">
                          {instructions.length}/20000
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <p className="micro mb-1">Extra</p>
                  <div className="border-y border-slate-800">
                    <Row
                      icon={<Zap className="h-4 w-4" />}
                      label="Auto Answer"
                      description="Answer questions automatically as they are detected"
                    >
                      <Toggle checked={autoAnswer} onChange={setAutoAnswer} label="Auto Answer" />
                    </Row>
                    <Row
                      icon={<Save className="h-4 w-4" />}
                      label="Save transcript"
                      description="Consent may be required — off keeps lines in memory only"
                    >
                      <Toggle
                        checked={saveTranscript}
                        onChange={setSaveTranscript}
                        label="Save transcript"
                      />
                    </Row>
                  </div>
                </div>

                {/* Mobile-only utility actions (rail buttons are desktop) */}
                <div className="flex gap-2 lg:hidden">
                  <button
                    type="button"
                    onClick={() => setView('tutorial')}
                    className="btn btn-ghost flex-1"
                  >
                    <Play className="h-3.5 w-3.5" /> Tutorial
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setActiveTab('mock');
                    }}
                    className="btn btn-ghost flex-1"
                  >
                    <ClipboardList className="h-3.5 w-3.5" /> Mock presets
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ──────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-3 border-t border-slate-800 px-6 py-4">
            <div className="min-w-0">
              {error && (
                <p role="alert" className="truncate text-xs text-rose-400">
                  {error}
                </p>
              )}
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              {view === 'form' && step === 1 ? (
                <>
                  <button type="button" onClick={onClose} className="btn btn-ghost">
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!step1Valid}
                    onClick={() => setStep(2)}
                    className="btn btn-primary"
                  >
                    Continue <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : view === 'tutorial' ? (
                <button type="button" onClick={() => setView('form')} className="btn btn-ghost">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to form
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn btn-ghost"
                    disabled={busy}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={busy || !step1Valid}
                    className="btn btn-primary"
                  >
                    {busy ? 'Creating…' : 'Create interview session'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
