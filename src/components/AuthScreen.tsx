import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

const GoogleLogo: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.64v3.02h3.88c2.27-2.09 3.54-5.17 3.54-8.9Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A11.99 11.99 0 0 0 12 24Z"
    />
    <path fill="#FBBC05" d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.62H1.27a12 12 0 0 0 0 10.76l3.99-3.11Z" />
    <path
      fill="#EA4335"
      d="M12 4.76c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A11.99 11.99 0 0 0 1.27 6.62l4 3.11C6.22 6.87 8.87 4.76 12 4.76Z"
    />
  </svg>
);

const POINTS = [
  {
    n: '01',
    title: 'Live question detection',
    body: 'Speech-to-text tracks the conversation and flags each question the moment it is asked.',
  },
  {
    n: '02',
    title: 'STAR answers, streamed',
    body: 'Structured, role-specific responses delivered while you keep talking — no screen switching.',
  },
  {
    n: '03',
    title: 'Your data, your project',
    body: 'Sessions, resumes and transcripts live in your own Firebase project under your rules.',
  },
];

const STATS = [
  { label: 'AI routing', value: 'Gemini + backup' },
  { label: 'Device policy', value: '1 desktop · 1 mobile' },
  { label: 'Billing', value: 'Per-answer wallet' },
];

export const AuthScreen: React.FC = () => {
  const { authEnabled, configError, demoMode, signInWithGoogle } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (configError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="panel w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <p className="micro mb-3">Configuration required</p>
          <h1 className="display text-2xl text-slate-100">Auth is not wired up</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{configError}</p>
          <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950 p-3 text-left font-mono text-[11px] leading-relaxed text-emerald-400">
            VITE_FIREBASE_API_KEY=...
            <br />
            VITE_FIREBASE_AUTH_DOMAIN=...
            <br />
            VITE_FIREBASE_PROJECT_ID=...
            <br />
            VITE_FIREBASE_APP_ID=...
          </div>
        </div>
      </div>
    );
  }

  if (!authEnabled) return null;

  const google = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 lg:grid lg:grid-cols-[1.1fr_30rem] xl:grid-cols-[1.25fr_32rem]">
      {/* ── Statement panel ─────────────────────────────────────────── */}
      <aside className="relative hidden overflow-hidden border-r border-slate-800 lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Hairline grid — structure, not decoration */}
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          aria-hidden="true"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)',
            backgroundSize: '52px 52px',
          }}
        />

        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900">
            <span className="font-mono text-[13px] font-semibold text-emerald-400">A/</span>
          </div>
          <div>
            <p className="text-[15px] font-semibold tracking-tight text-slate-100">
              AskMe<span className="text-emerald-400">Ai</span>
            </p>
            <p className="micro">Interview copilot</p>
          </div>
        </div>

        <div className="relative max-w-xl py-10">
          <p className="micro mb-5">Real-time interview intelligence</p>
          <h1 className="display text-[2.6rem] leading-[1.08] text-slate-100 xl:text-5xl">
            Walk into every interview
            <br />
            <em className="text-slate-500">already prepared.</em>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-400">
            AskMeAi listens to the live call, detects each question the moment it is asked and streams a
            STAR-format answer back — so you never break eye contact to type.
          </p>

          <ul className="mt-10 border-t border-slate-800">
            {POINTS.map((item) => (
              <li key={item.n} className="flex gap-5 border-b border-slate-800 py-5">
                <span className="font-mono text-[11px] leading-6 text-slate-600">{item.n}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-200">{item.title}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative grid grid-cols-3 gap-4 border-t border-slate-800 pt-6">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <p className="micro">{stat.label}</p>
              <p className="mt-1.5 text-[13px] font-medium text-slate-300">{stat.value}</p>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Sign-in panel ───────────────────────────────────────────── */}
      <main className="flex min-h-screen flex-col justify-center bg-slate-900 px-6 py-12 sm:px-10 lg:min-h-0">
        <div className="mx-auto w-full max-w-[24rem]">
          {/* Mobile brand */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950">
              <span className="font-mono text-[13px] font-semibold text-emerald-400">A/</span>
            </div>
            <p className="text-[15px] font-semibold tracking-tight text-slate-100">
              AskMe<span className="text-emerald-400">Ai</span>
            </p>
          </div>

          <p className="micro mb-4">Sign in</p>
          <h2 className="display text-3xl text-slate-100">Welcome back.</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Continue with Google to pick up your wallet, resumes and interview sessions.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2.5 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3.5 py-3 text-xs leading-relaxed text-rose-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={google}
            disabled={busy}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-slate-100 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
            ) : (
              <GoogleLogo className="h-[18px] w-[18px]" />
            )}
            Continue with Google
          </button>

          {demoMode && (
            <p className="mt-4 rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-3 font-mono text-[10.5px] leading-relaxed text-slate-500">
              NO API ON THIS ORIGIN — ADD <span className="text-amber-400">?DEMO=1</span> TO THE URL TO EXPLORE THE
              IN-BROWSER SAMPLE DATA.
            </p>
          )}

          <div className="mt-10 flex items-start gap-2.5 border-t border-slate-800 pt-5 text-[11.5px] leading-relaxed text-slate-500">
            <ShieldCheck className="mt-px h-3.5 w-3.5 flex-shrink-0 text-slate-600" />
            <span>
              Secured by Firebase Authentication (Google). Sessions are limited to one desktop and one mobile device.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};
