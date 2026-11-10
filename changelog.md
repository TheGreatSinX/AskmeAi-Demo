# Changelog — AskMeAi Interview Copilot

All notable changes to this project are logged here, newest first.
Entries are grouped by commit. Commits are pushed to `main`
(`https://github.com/TheGreatSinX/AskmeAi-Demo`) unless marked
*not yet pushed*; the live Cloudflare Worker at
`https://askmeai.thegreatsinx.workers.dev` rebuilds automatically from GitHub.
Every commit updates this file.

---

## 2026-11-10

### This commit — docs: record the manual Worker deploy, live checks and CPU times

- Adds the deploy, live verification and CPU figures to the `b9b83cf` entry.
- Documentation only. Deployed after the push with `npm run build` +
  `npx wrangler deploy` from a clean tree at this commit, because Workers
  Builds is not connected to the repo.

### `d2a3951`, `7f21c8d` — docs: changelog backfill, steering rule, Cloudflare secrets

- `d2a3951`: entries for every commit since `4e8f146` (2026-11-09 and
  2026-11-10), live URL updated, security invariants updated;
  `.kiro/steering/changelog.md` makes every commit update this file and
  requires asking before committing or pushing.
- `7f21c8d` records the Cloudflare secrets set for `b9b83cf` (below).

### `b9b83cf` — feat: run the API on Cloudflare Workers (free tier) with Firestore over REST

The live site was static files only, so after a real Google sign-in the app
fell back to the in-browser demo user. Cloud Run needs the paid Blaze plan, so
the API now runs in the same Cloudflare Worker that serves the site.

- **One Worker, `askmeai`** (`wrangler.jsonc`): `dist/` is served as Workers
  static assets with an SPA fallback; only `/api/*` runs the Worker
  (`run_worker_first`).
- **Shared API**: every route moved to `src/server/app.ts`, used by
  `server.ts` (Node, firebase-admin, local dev) and `src/worker/index.ts`
  (Workers). The entry point injects the store and the token verifier.
- **Firestore over REST** (`firestoreRest.ts`, `firestoreRestStore.ts`):
  firebase-admin cannot run on Workers. Same collections and document ids as
  `firestoreStore.ts`; service-account OAuth via `jose`; transactional reads
  via `batchGet`; transactions retried with backoff (10 concurrent deductions
  on one wallet: no lost updates).
- **ID token verification** (`idToken.ts`): `jose`, RS256 against Google's
  securetoken keys, iss/aud/exp/iat/auth_time checks. Accepts a real
  Google-signed token; rejects tampered, edited, unsigned (`alg: none`) and
  other-project tokens. Emulator tokens only when an emulator host is set.
- **`ADMIN_EMAILS` secret**: only listed owner emails with a verified Google
  email become `super_admin`. Before, the first sign-up did, which on a public
  site could be anyone.
- **Fixes**: `requireAdmin` refused `super_admin` and the Admin tab hid it;
  clear-data left wallets, subscriptions, resumes and documents behind (both
  stores); async route errors hung requests or crashed Node (now a JSON 500);
  production no longer switches to demo data on its own (shows "service
  unavailable"; demo only with `?demo=1` or the button).
- **Workers compatibility**: own JSON body parser (5 MB cap, 413) instead of
  body-parser; `iconv-lite` aliased to a UTF-8 shim; client IP from
  `CF-Connecting-IP` on Workers only.
- **`public/_headers`**: CSP, COOP `same-origin-allow-popups`, HSTS, nosniff,
  frame denial, Permissions-Policy; immutable caching for `/assets/*`.
- New deps: `jose`, `wrangler` (dev). Scripts: `npm run cf:dev`, `npm run deploy`.

**Verification:** lint, build, test:demo pass; Node server unchanged (health
`firestore`, 401 without or with a forged token); 28/28 Worker checks against
the Auth + Firestore emulators (own email shown, roles, cross-user 403,
credits + ledger, AI answer generated in the Worker, 400/413/404 JSON, static
headers, SPA fallback, GDPR clear); admin allow-list 4/4; `wrangler deploy
--dry-run` bundle 276 KiB gzip.

**Cloudflare secrets (console action, 2026-11-10):** set on Worker `askmeai`
(account thegreatsinx@gmail.com), values never printed: `GEMINI_API_KEYS`,
`GEMINI_MODEL`, `GEMINI_MODEL_FALLBACKS`, `BACKUP_AI_URL`, `BACKUP_AI_KEYS`,
`BACKUP_AI_MODELS` (from `.env`), `ADMIN_EMAILS` (both owner emails) and
`FIREBASE_SERVICE_ACCOUNT`.

**Deploy (console action, 2026-11-10 03:58 UTC):** pushing `7f21c8d` did not
trigger Cloudflare Workers Builds (the repo is not connected to Worker
`askmeai`), so it was deployed manually with `npm run build` +
`npx wrangler deploy` from a clean tree at `7f21c8d`: version `00dec4f7-…`,
bundle 276 KiB gzip, startup 36 ms.

**Live verification:** 14/14 checks on askmeai.thegreatsinx.workers.dev with
one throwaway account (removed from Firestore and Auth afterwards): health JSON
(`backend: firestore`, `authRequired: true`), 401 without and with a forged
token, CSP/COOP on the shell, real Google-signed token → 200 with role `user`
(ADMIN_EMAILS works), admin route 403, session create + complete charges 1
credit, clear-data. CPU per request (`wrangler tail`): median 6 ms, max 14 ms;
2 of 10 requests over the free plan's 10 ms (first `/api/me` on a cold isolate,
session completion), all finished `ok`. Wall time 0.3–4.1 s, mostly sequential
Firestore round trips.

**Accepted risk:** `FIREBASE_SERVICE_ACCOUNT` is the project's existing
firebase-adminsdk key (owner's choice), which has broader access than the
Worker needs (it can also manage Auth users). A Firestore-only service account
would limit the damage if the Cloudflare account were compromised. Keep 2FA on
the Cloudflare account.

### `24c13a3` — sec: deny all client access in Firestore rules

- `firestore.rules` now denies every client request. The browser never uses
  Firestore; the API uses firebase-admin / a service account, which bypass rules.
- The old rules let any signed-in Google account list every user's resumes,
  sessions and transcripts (`list: if isSignedIn()`), write sessions and answers
  directly (skipping credit charges), edit its own user doc and register
  devices. They also contained a hardcoded personal email.
- Emulator attack test as a stranger account: 8 of 9 attacks allowed before,
  9 of 9 denied after.
- **Deployed** to `socintel-111625-35761285-e248d` (ruleset `d52f6467-…`);
  the live ruleset matches the repo file.

### `fb9b19c` — fix: parse escaped FIREBASE_SERVICE_ACCOUNT and git-ignore key files

- dotenv keeps `\"` inside double quotes and expands `\n`, so the README's
  one-line escaped form never parsed; the server now unescapes it.
- Parse errors report length, line count and a hint, never the value.
- `.gitignore`: `serviceAccount*.json`, `*-firebase-adminsdk-*.json` (the
  README said the key file was ignored; it was not).
- Local setup (not in git): the multi-line JSON in `.env` was moved to a key
  file outside the repo and referenced via `GOOGLE_APPLICATION_CREDENTIALS`.

### `3f490c1` — sec: verify Google ID tokens always; remove demo-admin fallback

- The browser always ships Firebase config, but the server only verified tokens
  when its own env had Firebase settings. With no `.env` it treated every caller,
  signed in or not, as the local demo admin.
- `src/lib/firebaseProject.ts` shares the default project id and auth domain;
  firebase-admin falls back to verify-only mode for that project.
- Cached gcloud ADC is ignored on dev machines unless `FIREBASE_PROJECT_ID` is set.
- `attachAuth` fails closed: 503 when firebase-admin cannot initialize.

### `d1cc531` — fix: Google sign-in via popup and allow Firebase Auth in CSP

- Back to `signInWithPopup`: the app is not served from the Firebase
  authDomain, so browsers that partition third-party storage dropped the
  redirect result and users landed on the login screen again.
- CSP now allows `https://apis.google.com` and the authDomain /
  `accounts.google.com` frames (the popup finished but its result never reached
  the page). Google Fonts allowed; `object-src`, `base-uri`, `form-action`,
  `frame-ancestors` added. COOP `same-origin-allow-popups` instead of `unsafe-none`.

---

## 2026-11-09

### `ddb4381`, `fe4bc97`, `3b9356e`, `ec7337e`, `7786fe8` — sign-in COOP attempts

Five commits switching between `signInWithPopup` and `signInWithRedirect` and
between COOP `same-origin-allow-popups` and `unsafe-none`, to silence the
"Cross-Origin-Opener-Policy would block the window.closed call" warning. That
warning is benign; the actual causes were fixed in `d1cc531` above.

### `3589ae3` — feat: allow any Google-authenticated account to sign in

- Invitation-only check removed from account creation (`db.ts`,
  `firestoreStore.ts`); new sign-ups get the `user` role.

### `c3fbbec` — feat: modal-based clear data + bootstrap first admin

- The first sign-up becomes `super_admin` when no admin exists (replaced by
  `ADMIN_EMAILS` on Workers in `b9b83cf`).
- Hardcoded owner email removed from seeded defaults; Clear All Data and
  Revoke User confirmations moved to modals (no `window.confirm`).

### `9290a12` — sec: remove hardcoded super admin
### `4710933` — fix: remove demo notice from login page

### `155dbd2` — feat: clear all user data (GDPR / right to be forgotten)

- `DataStore.clearUserData()` (file + Firestore), `DELETE /api/user/clear-data`,
  Danger Zone in the Admin Users tab, `USER_CLEARED_DATA` audit event.

### `7cb38d2` — fix: remove hardcoded demo accounts from sign-in

- New accounts start blank with their own Google name; seeded names replaced.

### `197ff77` — sec: OWASP report, robots.txt, security.txt, .gitignore

### `c3f3c3d` — sec: OWASP Top 10 remediation + hardened Firebase rules

- Input validation and caps (credit adjustments, session status/duration,
  admin settings allow-list, roles, emails, text lengths, 5 MB body, 8 MB audio).
- `crypto.randomBytes` ids; LLM output sanitising; per-IP rate limits
  (100/min general, 20/min auth-heavy); security headers; stricter rules.

### `6b5b23b` — remove all mock data

### `e52b092`, `a83232e`, `73a78b1`, `cd8804b` — Granola-style live transcription

- Interim (partial) speech results shown live; questions detected from interim
  text and answered early (debounced); speech recognition restarts on its own
  and never blocks on network calls.

### `e020ee7`, `869eedc` — ui: Sandbox & Desktop moved into the Admin tab

- Coding sandbox and Electron guide are Quick Tools inside Admin; "Add User"
  action with Google-only guidance.

### `dee8afd` — sec: invitation-only enrolment + Firebase rules lock-down

- Enrolled-emails list (cap 2), `EnrollmentError` → 403, admin enrolment panel
  and `/api/admin/enrolled-users` routes, "not enrolled" wall.
  (The sign-in restriction was later removed in `3589ae3`.)

### `737dff3` — docs: log the Ink & Signal UI revamp and Google-only login in changelog

### `4e8f146` — feat: ParakeetAI create-session wizard (Details → Preferences)

Replicates ParakeetAI's two-step "Create session" modal — every control
wired end-to-end, no decorative fake features:

- **`src/components/CreateSessionModal.tsx`** (new): two-pane ink wizard
  with a steps rail (Details → Preferences), Escape/backdrop close and
  body scroll lock.
  - *Details*: target company, target role, grounding resume,
    session type (Interview / Meeting).
  - *Preferences*: call language (12 locales — drives speech recognition
    and answer language), **model** (populated from the real configured
    pool), **answer format** (STAR / Concise / Deep Technical /
    Step-by-step / Bullets / Full Script), **AI instructions**
    (standing guidance, 20k cap with counter), **Auto Answer** toggle,
    **Save transcript** toggle.
  - Left-rail utilities: **View tutorial** (in-pane walkthrough) and
    **Mock presets** (closes the modal and jumps to the mock tab);
    mobile footer mirrors both.
- **Real model preference**: `gemini.models` getter exports the
  configured pool (primary + fallbacks); `/api/me` returns it as
  `aiModels`; sessions persist `model` and `sessionModel()` re-validates
  the id against the live pool on every answer request (unknown ids fall
  back to the primary). The demo backend mirrors the pool.
- **Auto Answer**: off = the STT pipeline still detects questions but
  only toasts the match; Live Studio shows a manual **Answer** button on
  unanswered detected questions. On = existing auto-generation, now in
  the session's chosen answer style.
- **Save transcript (consent)**: off = transcript lines are returned for
  the live view but never persisted (server Firestore path and the demo
  backend both guard `db.addTranscriptLine` / the localStorage write).
- **Session defaults flow through**: `startNewSession` accepts the new
  options, `/api/sessions/create` stores them (allow-listed style,
  regex-guarded model id), and Live Studio seeds its format switcher
  from `session.answerStyle`.
- **Dashboard**: the inline start-session form is replaced by a CTA
  panel (what/why grid + shield note) that opens the modal; the header
  banner button opens it too.
- **Tests**: `scripts/smoke-demo-api.mts` asserts the `aiModels` pool,
  wizard defaults (star/true/true), a full prefs round-trip
  (bullets/false/false/model), unknown-style rejection to `star`, and
  that `saveTranscript:false` keeps lines out of storage while still
  returning them live. `npm run lint`, `npm run build`, `npm run test:demo`
  all green; edited `server.ts` boots clean (`/api/health` 200).

### `b0798bd` — ui+auth: "Ink & Signal" design revamp, strictly Google-only sign-in

**Design system — out of "AI slop"** (no gradient buttons/text, no
glassmorphism/backdrop-blur, no glow shadows, no decorative blur blobs,
no emoji-icon styling, no rounded-3xl pill cards):
- `index.html`: font stack rebuilt — **Inter Tight** (UI), **JetBrains
  Mono** (labels/data/buttons), **Instrument Serif** (display
  statements); `theme-color #0a0a0b`.
- `src/index.css`: Tailwind v4 `@theme` **ink palette** — neutral
  near-black neutrals overriding `slate-*` (no blue cast), plus shared
  `.micro` (mono uppercase label), `.display` (serif), `.panel` (flat
  hairline surface, max radius 12px), `.btn`/`.btn-primary`/`.btn-ghost`
  (mono uppercase buttons; emerald = primary only), neutral scrollbars
  and one consistent focus-visible outline. Emerald = signal,
  amber = credits, rose = danger; everything else is ink and gray.
- Hand-rewritten in the new language: **AuthScreen** (split screen,
  serif statement panel with numbered hairline rows), **Navbar** (flat
  bar, mono uppercase tabs with emerald active underline, flat `A/`
  logo mark), **App** (toasts = flat cards with a left accent bar;
  flat error/splash screens), **DashboardView** (flat panels, mono
  KPIs, serif welcome), **LiveStudioView** (flat studio panels,
  numbered STAR blocks, neutral speaker colors).
- Mechanical sweep of every secondary view (Coding, Vault, Knowledge,
  Open Source, Admin, Notes, Mock, Billing, DesktopHUD, Electron guide,
  Mermaid): `rounded-3xl/2xl` → `xl/lg`, decorative `blur-3xl` blobs
  deleted, `backdrop-blur-*` and colored/glow `shadow-*` stripped,
  gradients flattened to solid colors.

**Login page — strictly Google sign-in:**
- `AuthScreen` reduced to a single **"Continue with Google"** button:
  email/password fields, sign-up/reset modes, remember-email, and the
  demo button are gone.
- `AuthContext`: `signIn`/`signUp`/`sendPasswordReset` removed
  (+ unused firebase/auth imports); error map trimmed to
  popup/provider/domain cases; `signInWithGoogle` is the only sign-in
  path.
- **Auth activated on every build**: `src/lib/firebase.ts` now carries a
  committed `PUBLIC_WEB_CONFIG` fallback (Firebase web config = public
  client identifier by design; `VITE_FIREBASE_*` still overrides), so
  `authEnabled` is true on the static Cloudflare deploy too — the live
  site previously shipped with no Firebase config and could never show
  the login gate.
- Demo escape hatch moved from a login-screen button to **`?demo=1`**
  (auto `enterDemo` on mount) so the gate stays Google-only; a quiet
  mono notice on the login screen mentions it when no API is detected.
- `.githooks/pre-commit`: narrow, documented exception — the `AIza…`
  pattern is skipped for `src/lib/firebase.ts` only (public web key);
  `.env`, Gemini keys, PEM/JWT/service-account scans unchanged.

**Verification:** `tsc --noEmit` 0 errors · `vite build` ok ·
`npm run test:demo` all assertions pass · built bundle contains
"Continue with Google" + baked Firebase config and **no**
email/password/reset strings, no `Plus Jakarta`, ink palette present.
**Firebase console (user action) still required for live Google
sign-in**: enable the Google provider and add
`askmeai-demo.thegreatsinx.workers.dev` to Authorized domains; until
then use `?demo=1`.

---

### `891cd28` — feat: ParakeetAI parity — mock interviews, session modes, screenshots, billing

Full parity pass against the observable feature set of ParakeetAI
(researched from parakeet-ai.com + search): Auto Answer, session modes,
Instructions field, answer formats, screenshot answers, mock interviews,
AI Notes, per-session language, credit billing.

**Mock Interview (new view, "Mock Interview" tab)**
- AI interviewer that asks questions **out loud** (`speechSynthesis`), with a
  voice on/off toggle and replay button.
- Candidate answers by **voice** (one-shot Web Speech dictation) or typing.
- Every round is scored **0–100** with verdict, strengths, improvements, a
  tightened **model answer**, and the **likely follow-up question**.
- Configurable target role/company, difficulty (easy/medium/hard), and round
  count (3/5/10); ends in an average-score report card with per-question
  breakdown (expandable cards).
- Server routes (Gemini-backed with canned fallback): `POST /api/mock/next-question`
  (varied question types, never repeats asked questions) and
  `POST /api/mock/evaluate` (structured coaching JSON). Both mirrored in the
  in-browser demo backend with a local question bank + heuristic scorer.

**Session modes, instructions & language**
- `SessionMode = 'interview' | 'meeting'` stored on every session; the studio
  header shows the active mode chip.
- **Instructions field** (ParakeetAI parity): up to 20,000 standing
  characters set on the Dashboard, persisted with the session, and injected
  into every answer prompt ("always obey").
- **Language selection**: 12 languages (EN/ES/FR/DE/PT/HI/JA/KO/ZH/AR/IT/ID);
  drives the Web Speech recognition language (`recognition.lang`, previously
  hard-coded `en-US`) and instructs the model to answer in that language.
- Dashboard start-session form gains the mode toggle, language select, and
  instructions textarea; `createSession` accepts them on both the Express API
  and the demo backend.

**Answer formats**
- `AnswerStyle` extended with **`bullets`** (scannable one-liners) and
  **`full_script`** (word-for-word spoken script) alongside STAR / Concise /
  Technical / Step-by-Step — studio switcher now offers all six, server prompt
  defines each, demo `composeAnswer` implements both, and the server
  validates `answerStyle` against an allow-list.

**Screenshot / photo → answer**
- Live Studio gains **Screenshot** (grabs a `getDisplayMedia` frame) and
  **Photo** (file upload) buttons; images are downscaled to ≤1600px JPEG
  before sending.
- New route `POST /api/sessions/:id/answer-from-image`: multimodal Gemini call
  (`inlineData`) that reads the question from the image and answers it
  resume-grounded; 15 MB payload guard, JSON fallback when the image is
  unreadable. Demo mode composes a local answer and marks the grounding
  source as local.

**System-design diagrams**
- `generate-answer` now emits a fenced **mermaid** `flowchart` for system
  design / architecture / scale questions.
- New dependency-free `MermaidDiagram`/`AnswerBody` components parse simple
  flowcharts and render them as **layered SVG** inside the answer card;
  anything unparseable falls back to a formatted code block (nothing lost).

**Billing & credits UI (closes the Module L audit gap)**
- New **Billing** tab (nav + mobile nav): Starter **$29** / Pro **$79** /
  Executive **$199** plans wired to `updateSubscription`, credit packs
  (100/500/1000) wired to `purchaseCredits` — both endpoints previously had
  **zero call sites** — plus a full **transaction-history table** with type
  badges and a wallet summary (balance, lifetime bought/used).
- Honest notice: checkout is simulated end-to-end; no payment details are
  ever collected.

**Fixes & polish**
- AI Notes now **renders Action Items** (they were generated but never
  displayed) and includes them in the Markdown export (as `- [ ]` checkboxes)
  — closes another audit gap.
- Live Studio header shows a live **credit-balance ticker** (audit gap: no
  in-studio credits ticker).
- Smoke test extended: session mode/instructions/language persistence,
  `bullets`, `full_script`, `answer-from-image`, and both mock routes'
  contracts.

**Verification:** `tsc --noEmit` 0 errors · `vite build` ok ·
`npm run test:demo` all assertions pass · new routes return 401 (registered)
behind auth on the live dev server · bundle credential scan clean.

---

### `3376f6a` — test: verify meeting notes summarization against the real AI pipeline

- New `scripts/test-notes-summary.mts` (`npm run test:notes`) replays the
  **exact** `POST /api/notes/generate` prompt (same transcript formatting,
  same `SessionNotes` JSON schema) through the live Gemini router — 3-key
  rotation, `gemini-3.5-flash` — with a realistic 6-line meeting transcript
  plus a recorded answer, then asserts every field of the contract.
- Result: passes (~7 s) returning executive summary, key topics, action
  items, strengths, areas for improvement, and thank-you email draft.
- Confirms the meeting-notes/summarization feature end-to-end.

### `ea251ec` — feat: in-browser demo mode so the static deploy works with zero credentials

- New `src/lib/demoApi.ts`: a full in-browser backend mirroring every
  `server.ts` route — localStorage only (`askmeai.demo.v1`), **no network
  calls, no credentials** in the public bundle.
- `src/lib/api.ts`: `json()` detects our own SPA shell responses
  (`looksLikeSpaShell`) and transparently fails over to the demo backend;
  `isDemoMode`/`setDemoMode`/`onDemoModeChange` exported.
- AuthContext probes `/api/health` on load (non-JSON/shell → demo mode);
  AuthScreen gains an explicit **"Explore the demo"** bypass; Navbar shows a
  **DEMO** chip; App gains a backend-missing escape hatch with retry.
- Result: the static Cloudflare Worker site runs the whole product —
  sessions, answers, notes, coding, admin, persistence — with zero browser
  credentials.

### `9146c61` — fix: detect and explain a missing API instead of failing on HTML

- Malformed JSON body → `400 {"error":"Invalid JSON body."}`; unknown
  `/api/*` → JSON 404; SPA fallback scoped strictly after API routes.
- Full-screen "Cannot reach the AskMeAi server" notice with Retry and demo
  fallback instead of silent per-request failures.

### `eea2633` — feat: professional login screen

- Redesigned `AuthScreen`: branded dark UI with emerald gradient, Google
  sign-in, demo bypass, and clear states for auth-disabled environments.

### `92b79fb` — docs: replace README credential example, fix auth claims, add secret-scan hook

- README credential example removed (no credential exposure anywhere in the
  repo surface).
- `.githooks/pre-commit` **secret-scan** hook (runs automatically via
  `core.hooksPath`; scans staged files for key patterns before every commit).

### `14bcf1d` — feat: Firebase Auth, Firestore persistence, and AI failover

- Real **Firebase Auth** (Google) + **Firestore** persistence with a
  three-tier auto-select backend (file JSON → Firestore → demo), enforced via
  server-side `firebase-admin` only — **Gemini keys never reach the browser**.
- **AI failover**: 3 Gemini keys with quota rotation
  (`gemini-3.5-flash` primary, `gemini-3.6-flash` fallback) plus a backup
  provider (Deploy, `reasoning_effort: low`); 429→cool/rotate, 401/403→retire,
  5xx/timeout→park; budget split Gemini 60% / backup remainder with a 10 s
  floor (`safeGenerateContent`).
- Firestore security **rules deployed** (release `firestore`, ruleset
  `a93bedf4-…`, byte-identical to local).

---

## 2026-11-08

### `598b3be` — feat: initialize project scaffolding
### `d431370` — Initial commit

---

## Alignment notes vs. `implementation_plan.md`

Audited `.aistudio/artifacts/brain/…/implementation_plan.md` against the
shipped code (see audit for full detail):

**Deliberate divergences**
| Plan | Shipped |
|---|---|
| `gemini-3.8-flash` / `gemini-4-argon` | `gemini-3.5-flash` + `3.6-flash` fallback + Deploy backup, 3-key rotation |
| SSE token streaming | Single JSON responses (no SSE/WebSocket) |
| TF-IDF RAG + `knowledge_chunks` | Document context grounding (`content.slice(0,1000)`) |
| Stripe + webhooks | Simulated checkout; wallet/ledger endpoints real, no payment provider |

**Native-only ParakeetAI features — out of scope for this web app** (and why)
- Invisible dock/activity-monitor/cursor/tab-switch screen-share modes →
  requires a native capture agent.
- Automatic meeting detection (auto-join) → requires OS-level hooks.
- Native iOS/Android apps → this is a responsive web app.
- AI headshots / resume-maker generator / employer blocklist compliance →
  separate products, not an interview copilot.

**Known remaining gaps** (tracked, not yet built): email verification & GDPR
account deletion, admin AI token-consumption graphs (needs `ai_usage`
collection), 5 of 18 planned Firestore collections (`payments`, `invoices`,
`knowledge_chunks`, `ai_usage`, `support_tickets`), Electron main/preload
packaging (guide modal only), `Ctrl+Shift+Q` hotkey, answer bookmarking.

---

## Verification matrix (run before every release)

```bash
npm run lint        # tsc --noEmit        → 0 errors
npm run build       # vite production build
npm run test:demo   # in-browser demo backend contract (all routes)
npm run test:notes  # real-Gemini meeting-notes summarization
```

## Security invariants

- No credential ever appears in the public README or browser bundle; the
  only key in the client is Firebase's **public** web API key (by design).
- All AI and Firestore calls happen server-side: Worker secrets in production,
  `.env` locally. The pre-commit secret-scan hook blocks accidental commits
  (enable it with `git config core.hooksPath .githooks`).
- Firestore rules deny every client request; only the server's service
  account reads and writes data.
- Demo mode makes **zero network requests** and stores nothing but this
  browser's `localStorage`.
