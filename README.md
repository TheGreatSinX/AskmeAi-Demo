# AskMeAi — AI Interview Copilot

Real-time AI interview copilot built with React + Vite, an Express API server, Google Gemini
(`@google/genai`) and **Firebase** (Authentication + Firestore).

Features: live speech-to-text question detection, STAR answer streaming, coding sandbox,
resume intelligence, knowledge-base RAG grounding, AI session notes, credit wallet billing,
a floating desktop HUD and a role-based admin console.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

With no Firebase configuration the app boots in **local demo mode**: data is stored in
`data/database.json` and the seeded `Alex Rivers` (super_admin) account is used automatically —
no sign-in screen.

---

## Firebase integration

The server picks its persistence layer at boot:

| Condition | Store | Auth |
|---|---|---|
| `DATA_BACKEND=file` | local `data/database.json` | demo account |
| Firebase credentials present | **Cloud Firestore** via `firebase-admin` | **Firebase ID token required** |
| Nothing configured | local `data/database.json` | demo account |

### 1. Create the project

```bash
npm i -g firebase-tools          # or use npx
firebase login
firebase use --add               # select the project, sets .firebaserc
firebase deploy --only firestore:rules
```

> `firestore.rules` locks every collection down: users can only read their own documents,
> wallets/subscriptions are server-writable only, and audit logs are admin-only.

### 2. Enable the sign-in methods

Firebase console → **Authentication → Sign-in method** → enable **Email/Password** and **Google**.

### 3. Client configuration

Firebase console → **Project settings → General → Your apps → Web app** → copy the config into `.env`:

```bash
cp .env.example .env
```

```dotenv
VITE_FIREBASE_API_KEY="AIza..."
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project"
VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="1234567890"
VITE_FIREBASE_APP_ID="1:1234567890:web:abcdef"
```

Vite inlines `VITE_*` values into the browser bundle at dev/build time.

### 4. Server credentials

**Project settings → Service accounts → Generate new private key**, then hand it to the server in
any one of these forms (all go into `.env`):

```dotenv
# a) raw JSON (single line, quotes escaped)
FIREBASE_SERVICE_ACCOUNT="{\"type\":\"service_account\",...}"

# b) base64-encoded JSON
FIREBASE_SERVICE_ACCOUNT="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9..."

# c) file path (recommended for local dev — the file is git-ignored)
GOOGLE_APPLICATION_CREDENTIALS="./serviceAccount.json"

# d) only a project id, for environments with ambient credentials
#    (Cloud Run / GCE / workload identity)
FIREBASE_PROJECT_ID="your-project"
```

Without any of these the server falls back to the JSON store and logs a warning.

### 5. Run

```bash
npm run dev
```

Server startup prints the selected mode:

```
[Firebase] firebase-admin initialized for project "your-project"
[AskMeAi] Auth: Firebase ID tokens required | Store: firestore
```

---

## How the integration works

```
Browser (React)                         Express server (server.ts)
─────────────────                       ─────────────────────────
signInWithEmailAndPassword / Google  →  onAuthStateChanged
getIdToken() on every request           attachAuth: verifyIdToken()
Authorization: Bearer <idToken>     →   uid = req.auth.uid
                                        db.ensureUser()  (provisions on 1st sign-in)
                                        FirestoreStore (firebase-admin)
```

- **`src/lib/firebase.ts`** — web SDK init; `authEnabled` is false when `VITE_FIREBASE_*` is absent.
- **`src/lib/authToken.ts`** — bridges the auth context to the fetch layer.
- **`src/lib/api.ts`** — attaches the bearer token and retries once after a 401 with a refreshed token.
- **`src/context/AuthContext.tsx`** — session state, email/password + Google sign-in, sign-out.
- **`src/components/AuthScreen.tsx`** — sign-in / sign-up UI (also reports client/server config mismatches).
- **`src/server/firebaseAdmin.ts`** — credential resolution (JSON / base64 / file / ADC / emulators).
- **`src/server/dataStore.ts`** — the persistence contract.
- **`src/server/db.ts`** — JSON file store (development fallback).
- **`src/server/firestoreStore.ts`** — Firestore store: transactional credit ledger, batched seeding,
  deterministic device ids (`<uid>_<deviceType>`) enforcing the 1 desktop + 1 mobile rule.
- **`src/server/store.ts`** — picks the active store.
- **`src/server/demoSeed.ts`** — sample resume, knowledge doc and mock interview given to new accounts
  (disable with `SEED_DEMO_DATA="false"`).

### Firestore collections

`users`, `user_devices`, `credit_wallets`, `credit_transactions`, `subscriptions`, `resumes`,
`documents`, `sessions`, `session_transcripts`, `session_answers`, `session_notes`, `audit_logs`,
`admin_settings`.

> Queries filter on a single field and sort in memory, so **no composite indexes** are required.

### Authorization

Every `/api/*` route except `/api/health` requires a verified token (or falls back to the demo
account when Firebase is not configured). Sessions, resumes, documents and transcripts are scoped to
`req.auth.uid`; `/api/admin/*` additionally requires the `super_admin`/`admin` role from the user
document (`thegreatsinx@gmail.com` is seeded as `super_admin`).

---

## Local Firebase emulators

```bash
npx firebase-tools emulators:start --only auth,firestore --project demo-askmeai
```

Then start the app with the emulator hosts (no service account required):

```dotenv
FIREBASE_AUTH_EMULATOR_HOST="localhost:9099"
FIRESTORE_EMULATOR_HOST="localhost:8080"
```

Keep the same web config as production (any project id — the emulators do not validate it) and add

```dotenv
VITE_FIREBASE_AUTH_EMULATOR_HOST="localhost:9099"
```

so the browser signs in against the Auth emulator as well.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Express + Vite dev server |
| `npm run build` | Production client bundle (`dist/`) |
| `npm start` | Production server (`NODE_ENV=production npm start`) |
| `npm run lint` | TypeScript type-check |
| `npm run clean` | Remove `dist/` |

## Environment variables

See [`.env.example`](.env.example) for every supported variable (`GEMINI_API_KEYS`, `GEMINI_MODEL`,
Firebase client config, Firebase Admin credentials, `DATA_BACKEND`, `SEED_DEMO_DATA`).

### Gemini key rotation

`GEMINI_API_KEYS` takes a comma-separated pool of keys. Requests rotate over the pool and the router
keeps it healthy on its own:

| Failure | Meaning | Server reaction |
|---|---|---|
| `429` | quota hit on one key | that key is cooled down (or until the API's `retryDelay`), the **next key** serves the request |
| `401` / `403` | key rejected | key retired for the rest of the process |
| `5xx` / timeout | model overloaded or hung | that **model** is parked, the next model in `GEMINI_MODEL_FALLBACKS` takes over |

Keys exist only in the server process: they are never sent to the browser, never logged (only the key
number), and never appear in `dist/`. Verify after a build with:

```powershell
Select-String -Path dist\assets\*.js -Pattern 'AQ\.','GEMINI_API'
```

### Backup AI provider

When every Gemini key and model has failed — or Gemini is not configured at all — the request falls
through to an OpenAI-compatible provider (`BACKUP_AI_URL`), which rotates over its own key pool:

| Variable | Purpose |
|---|---|
| `BACKUP_AI_URL` | Base URL, e.g. `https://api-cdn.deploy.com/api/v1` |
| `BACKUP_AI_KEYS` | Comma-separated bearer tokens (the **Secret Key**, not the Access Key ID) |
| `BACKUP_AI_MODELS` | Model ids, tried in order |
| `BACKUP_AI_REASONING_EFFORT` | `low` by default — the models' own default (`max`) can spend the entire completion budget thinking and return an empty answer |

The budget is split so a hung Gemini cannot starve the fallback: Gemini gets 60% of the caller's
timeout, the backup gets whatever is left (with a 10s floor). Callers only ever read `.text`, so the
swap between providers is invisible to them.

TinyFish is **not** wired in: it exposes Agent/Research/Search/Fetch/Browser/Monitor APIs and has no
text-generation endpoint.

### Firestore reachability probe

At startup the server performs one cheap Firestore read before choosing it as the backend. When the
credentials cannot reach the project it keeps Firebase Auth verifying real ID tokens but stores data
in `data/database.json` — which is what happens on a dev machine whose `gcloud` account has no access
to the project. Explicit credentials (`FIREBASE_SERVICE_ACCOUNT`) and emulator mode still fail fast;
only ambient Application Default Credentials may degrade.

### Authentication without a service account

`verifyIdToken` needs no private key: firebase-admin fetches Google's public Secure Token
certificates and checks the issuer and audience against the project id. So with only
`FIREBASE_PROJECT_ID` (or the client's `VITE_FIREBASE_PROJECT_ID`) the server runs in **verify-only**
mode — real Firebase Auth in the browser, local data until `FIREBASE_SERVICE_ACCOUNT` arrives.
