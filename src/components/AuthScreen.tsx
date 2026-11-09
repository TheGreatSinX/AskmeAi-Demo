import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Mail,
  Lock,
  User2,
  AlertCircle,
  LogIn,
  UserPlus,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  ChevronLeft,
  Mic,
  Compass,
} from 'lucide-react';

type Mode = 'signin' | 'signup' | 'reset';
type Busy = 'signin' | 'signup' | 'google' | 'reset' | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REMEMBER_KEY = 'askmeai.auth.rememberedEmail';

/** 0 = unusable ... 4 = strong. Length first, then character variety. */
function passwordScore(value: string): number {
  if (value.length < 8) return value.length >= 6 ? 1 : 0;
  let variety = 0;
  if (/[a-z]/.test(value)) variety++;
  if (/[A-Z]/.test(value)) variety++;
  if (/[0-9]/.test(value)) variety++;
  if (/[^A-Za-z0-9]/.test(value)) variety++;
  if (variety <= 1) return 1;
  if (variety === 2) return 2;
  if (variety === 3) return 3;
  return value.length >= 12 ? 4 : 3;
}

const STRENGTH = [
  { label: 'Too short', bar: 'bg-rose-500', text: 'text-rose-400' },
  { label: 'Weak', bar: 'bg-rose-500', text: 'text-rose-400' },
  { label: 'Fair', bar: 'bg-amber-500', text: 'text-amber-400' },
  { label: 'Good', bar: 'bg-lime-500', text: 'text-lime-400' },
  { label: 'Strong', bar: 'bg-emerald-500', text: 'text-emerald-400' },
];

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

interface FieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  icon: React.ReactNode;
  placeholder?: string;
  autoComplete?: string;
  error?: string | null;
  hint?: React.ReactNode;
  trailing?: React.ReactNode;
  onBlur?: () => void;
  onKeyUp?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  required?: boolean;
}

const Field: React.FC<FieldProps> = ({
  id,
  label,
  type,
  value,
  onChange,
  icon,
  placeholder,
  autoComplete,
  error,
  hint,
  trailing,
  onBlur,
  onKeyUp,
  required,
}) => (
  <div>
    <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-slate-300">
      {label}
    </label>
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">{icon}</span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyUp={onKeyUp}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full rounded-xl border bg-slate-950/80 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
          trailing ? 'pl-10 pr-12' : 'px-10'
        } ${
          error
            ? 'border-rose-500/60 focus:border-rose-500/70 focus:ring-rose-500/20'
            : 'border-slate-700/80 focus:border-emerald-500/60 focus:ring-emerald-500/20'
        }`}
      />
      {trailing}
    </div>
    {error ? (
      <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-center gap-1.5 text-[12px] text-rose-400">
        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
        {error}
      </p>
    ) : hint ? (
      <p className="mt-1.5 text-[12px] text-slate-500">{hint}</p>
    ) : null}
  </div>
);

export const AuthScreen: React.FC = () => {
  const { authEnabled, configError, demoMode, enterDemo, signIn, signUp, signInWithGoogle, sendPasswordReset } =
    useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [resetSentTo, setResetSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);

  // Prefill the address from the last successful visit.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) setEmail(saved);
    } catch {
      /* storage unavailable (private mode) - not fatal */
    }
  }, []);

  if (configError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-slate-900/80 p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-bold text-white">Configuration required</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{configError}</p>
          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-left font-mono text-[11px] leading-relaxed text-emerald-400">
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

  const emailInvalid = !EMAIL_RE.test(email.trim());
  const emailError = touched.email && emailInvalid ? 'Enter a valid email address.' : null;
  const passwordError =
    touched.password && mode !== 'reset'
      ? mode === 'signup'
        ? password.length < 6
          ? 'Use at least 6 characters.'
          : null
        : password.length === 0
          ? 'Enter your password.'
          : null
      : null;
  const nameError = touched.name && mode === 'signup' && !displayName.trim() ? 'Tell us what to call you.' : null;

  const formInvalid = emailInvalid || (mode !== 'reset' && password.length === 0) || (mode === 'signup' && (!password || password.length < 6 || !displayName.trim()));

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setResetSentTo(null);
    setTouched({});
    setShowPassword(false);
    setCapsLock(false);
  };

  const rememberEmail = (value: string) => {
    try {
      if (remember) localStorage.setItem(REMEMBER_KEY, value);
      else localStorage.removeItem(REMEMBER_KEY);
    } catch {
      /* ignore */
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setTouched({ email: true, password: true, name: true });
    if (formInvalid) return;

    const action: Busy = mode === 'signin' ? 'signin' : mode === 'signup' ? 'signup' : 'reset';
    setBusy(action);
    try {
      const address = email.trim();
      rememberEmail(address);
      if (mode === 'signin') {
        await signIn(address, password);
      } else if (mode === 'signup') {
        await signUp(address, password, displayName);
      } else {
        await sendPasswordReset(address);
        setResetSentTo(address);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const google = async () => {
    setError(null);
    setBusy('google');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setBusy(null);
    }
  };

  const subtitle =
    mode === 'signup'
      ? 'Create an account to sync your wallet, resumes and interview sessions across devices.'
      : mode === 'reset'
        ? "We'll email you a link to choose a new password."
        : 'Sign in to pick up where you left off.';

  const passwordToggle = (
    <button
      type="button"
      onClick={() => setShowPassword((v) => !v)}
      aria-label={showPassword ? 'Hide password' : 'Show password'}
      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 transition hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
    >
      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* ── Brand panel ─────────────────────────────────────────────── */}
      <aside className="relative hidden overflow-hidden border-r border-slate-800/80 bg-slate-950 lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div
          className="pointer-events-none absolute -left-32 top-1/4 h-[26rem] w-[26rem] rounded-full bg-emerald-500/15 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          aria-hidden="true"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.07) 1px, transparent 1px)',
            backgroundSize: '46px 46px',
            maskImage: 'radial-gradient(ellipse at 30% 20%, black, transparent 78%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 30% 20%, black, transparent 78%)',
          }}
        />

        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-lg shadow-emerald-500/20">
            <Sparkles className="h-5 w-5 fill-slate-950" />
          </div>
          <div>
            <p className="text-base font-extrabold tracking-tight text-white">
              AskMe<span className="text-emerald-400">Ai</span>
            </p>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Interview copilot</p>
          </div>
        </div>

        <div className="relative max-w-lg py-10">
          <h2 className="text-3xl font-extrabold leading-[1.15] tracking-tight text-white xl:text-4xl">
            Walk into every interview
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              already prepared.
            </span>
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
            AskMeAi listens to the live call, detects each question the moment it is asked and streams a
            STAR-format answer back — so you never break eye contact to type.
          </p>

          <ul className="mt-8 space-y-4">
            {[
              {
                icon: <Mic className="h-4 w-4" />,
                title: 'Live question detection',
                body: 'Speech-to-text tracks the conversation and flags the question in real time.',
              },
              {
                icon: <Sparkles className="h-4 w-4" />,
                title: 'STAR answers, streamed',
                body: 'Structured, role-specific responses delivered while you keep talking.',
              },
              {
                icon: <ShieldCheck className="h-4 w-4" />,
                title: 'Your data, your project',
                body: 'Sessions, resumes and transcripts live in your own Firebase project.',
              },
            ].map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
                  {item.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative grid grid-cols-3 gap-4 border-t border-slate-800/80 pt-6">
          {[
            { label: 'AI routing', value: 'Gemini + backup' },
            { label: 'Device policy', value: '1 desktop · 1 mobile' },
            { label: 'Billing', value: 'Per-answer wallet' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-600">{stat.label}</p>
              <p className="mt-1 text-[13px] font-semibold text-slate-300">{stat.value}</p>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Form panel ──────────────────────────────────────────────── */}
      <main className="flex min-h-screen flex-col justify-center px-6 py-10 sm:px-10 lg:min-h-0">
        <div className="mx-auto w-full max-w-[26rem]">
          {/* Mobile brand */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400">
              <Sparkles className="h-5 w-5 fill-slate-950" />
            </div>
            <p className="text-lg font-extrabold tracking-tight text-white">
              AskMe<span className="text-emerald-400">Ai</span>
            </p>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-[1.7rem]">
              {mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Welcome back'}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{subtitle}</p>
          </div>

          {mode !== 'reset' && (
            <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
              <button
                type="button"
                onClick={() => switchMode('signin')}
                aria-pressed={mode === 'signin'}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                  mode === 'signin' ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LogIn className="h-3.5 w-3.5" /> Sign in
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                aria-pressed={mode === 'signup'}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                  mode === 'signup' ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserPlus className="h-3.5 w-3.5" /> Create account
              </button>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-950/40 px-3.5 py-3 text-xs leading-relaxed text-rose-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'reset' && resetSentTo ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center shadow-2xl shadow-black/40">
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-white">Check your inbox</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                We sent a password-reset link to <span className="font-medium text-slate-200">{resetSentTo}</span>. It
                expires in a short while — check spam if it does not arrive.
              </p>
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400 transition hover:text-emerald-300"
              >
                <ChevronLeft className="h-4 w-4" /> Back to sign in
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={submit} noValidate className="space-y-3.5">
                {mode === 'signup' && (
                  <Field
                    id="name"
                    label="Full name"
                    type="text"
                    value={displayName}
                    onChange={setDisplayName}
                    icon={<User2 className="h-4 w-4" />}
                    placeholder="Alex Rivers"
                    autoComplete="name"
                    error={nameError}
                    onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                    required
                  />
                )}

                <Field
                  id="email"
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  icon={<Mail className="h-4 w-4" />}
                  placeholder="you@company.com"
                  autoComplete="email"
                  error={emailError}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  required
                />

                {mode !== 'reset' && (
                  <div>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <label htmlFor="password" className="block text-[13px] font-medium text-slate-300">
                        Password
                      </label>
                      {mode === 'signin' && (
                        <button
                          type="button"
                          onClick={() => switchMode('reset')}
                          className="text-[12px] font-medium text-slate-500 transition hover:text-emerald-400"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                        <Lock className="h-4 w-4" />
                      </span>
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                        onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                        onKeyDown={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                        placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        aria-invalid={Boolean(passwordError)}
                        aria-describedby={passwordError ? 'password-error' : undefined}
                        className={`w-full rounded-xl border bg-slate-950/80 py-2.5 pl-10 pr-12 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:ring-2 ${
                          passwordError
                            ? 'border-rose-500/60 focus:border-rose-500/70 focus:ring-rose-500/20'
                            : 'border-slate-700/80 focus:border-emerald-500/60 focus:ring-emerald-500/20'
                        }`}
                      />
                      {passwordToggle}
                    </div>

                    {passwordError ? (
                      <p id="password-error" role="alert" className="mt-1.5 flex items-center gap-1.5 text-[12px] text-rose-400">
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        {passwordError}
                      </p>
                    ) : capsLock ? (
                      <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-amber-400">
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        Caps Lock is on.
                      </p>
                    ) : null}

                    {mode === 'signup' && password.length > 0 && (
                      <div className="mt-2.5">
                        <div className="flex gap-1.5" aria-hidden="true">
                          {[0, 1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-colors ${
                                i < passwordScore(password) ? STRENGTH[passwordScore(password)].bar : 'bg-slate-800'
                              }`}
                            />
                          ))}
                        </div>
                        <p className={`mt-1.5 text-[12px] ${STRENGTH[passwordScore(password)].text}`}>
                          {STRENGTH[passwordScore(password)].label} password
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {mode !== 'reset' && (
                  <label className="flex cursor-pointer items-center gap-2.5 text-[12.5px] text-slate-400 select-none">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-950 accent-emerald-500"
                    />
                    Remember my email on this device
                  </label>
                )}

                <button
                  type="submit"
                  disabled={Boolean(busy)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy && busy !== 'google' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : mode === 'signup' ? (
                    <>
                      <UserPlus className="h-4 w-4" /> Create account
                    </>
                  ) : mode === 'reset' ? (
                    <>
                      <KeyRound className="h-4 w-4" /> Send reset link
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" /> Sign in
                    </>
                  )}
                </button>

                {mode === 'reset' && (
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="flex w-full items-center justify-center gap-1.5 py-1 text-[13px] font-medium text-slate-400 transition hover:text-slate-200"
                  >
                    <ChevronLeft className="h-4 w-4" /> Back to sign in
                  </button>
                )}
              </form>

              {mode !== 'reset' && (
                <>
                  <div className="my-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-800" />
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                      or continue with
                    </span>
                    <div className="h-px flex-1 bg-slate-800" />
                  </div>

                  <button
                    type="button"
                    onClick={google}
                    disabled={Boolean(busy)}
                    className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-700 bg-white py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy === 'google' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                    ) : (
                      <GoogleLogo />
                    )}
                    Continue with Google
                  </button>

                  {demoMode && (
                    <>
                      <div className="my-4 flex items-center gap-3">
                        <div className="h-px flex-1 bg-slate-800" />
                        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                          or explore without an account
                        </span>
                        <div className="h-px flex-1 bg-slate-800" />
                      </div>

                      <button
                        type="button"
                        onClick={enterDemo}
                        disabled={Boolean(busy)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Compass className="h-4 w-4" />
                        Explore the demo
                      </button>
                      <p className="mt-2.5 text-center text-[11px] leading-relaxed text-slate-500">
                        <span className="font-semibold text-amber-400/90">No backend connected.</span> This build runs
                        entirely in your browser with sample data — nothing you enter leaves this device.
                      </p>
                    </>
                  )}
                </>
              )}
            </>
          )}

          <div className="mt-7 flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
            <ShieldCheck className="mt-px h-3.5 w-3.5 flex-shrink-0 text-emerald-500/80" />
            <span>
              Secured by Firebase Authentication. Sessions are limited to one desktop and one mobile device.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};
