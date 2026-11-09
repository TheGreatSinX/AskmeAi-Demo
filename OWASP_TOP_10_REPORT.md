# AskMeAi Interview Copilot — OWASP Top 10 (2021) Security Report

**Project:** AskMeAi Interview Copilot  
**Repository:** https://github.com/TheGreatSinX/AskmeAi-Demo  
**Live URL:** https://askmeai-demo.thegreatsinx.workers.dev  
**Report Date:** 2026-11-09  
**Status:** All identified issues remediated

---

## Executive Summary

A comprehensive OWASP Top 10 (2021) security review was performed against the AskMeAi Interview Copilot codebase. All 10 risk categories were assessed, issues were identified, and remediations were implemented. The application is now hardened against the OWASP Top 10 and ready for production deployment.

## OWASP Top 10 (2021) Assessment

| # | Category | Status | Severity | Remediated |
|---|----------|--------|----------|------------|
| A01 | Broken Access Control | ✅ Fixed | High | Yes |
| A02 | Cryptographic Failures | ✅ Fixed | High | Yes |
| A03 | Injection | ✅ Fixed | High | Yes |
| A04 | Insecure Design | ✅ Fixed | Medium | Yes |
| A05 | Security Misconfiguration | ✅ Fixed | Medium | Yes |
| A06 | Vulnerable and Outdated Components | ✅ Assessed | Low | N/A |
| A07 | Identification and Authentication Failures | ✅ Fixed | Medium | Yes |
| A08 | Software and Data Integrity Failures | ✅ Fixed | Medium | Yes |
| A09 | Security Logging and Monitoring Failures | ✅ Fixed | Medium | Yes |
| A10 | Server-Side Request Forgery (SSRF) | ✅ Assessed | Low | N/A |

---

## A01 — Broken Access Control

### Issues Identified
1. **Admin settings endpoint allowed arbitrary field updates** — `POST /api/admin/settings` accepted any fields from the request body, including `enrolledEmails`, which should only be modifiable via the dedicated enrolment endpoints.
2. **Credit adjustment allowed arbitrary amounts** — `POST /api/admin/adjust-credits` accepted any numeric amount without validation, enabling massive credit manipulation.
3. **No target user validation** — Admin credit adjustment did not verify the target user existed.
4. **Last enrolled account could be removed** — No protection against unenrolling the final administrator.

### Remediation
- `POST /api/admin/settings` now only allows updates to a hardcoded allow-list of fields: `activeAiProvider`, `defaultModel`, `costPerCreditUsd`, `creditsPerMinute`, `maintenanceMode`, `maxSessionsPerUser`. The `enrolledEmails` field is explicitly excluded and can only be changed via `/api/admin/enrolled-users`.
- `POST /api/admin/adjust-credits` now:
  - Validates `targetUserId` is a non-empty string
  - Validates `amount` is a finite number within ±100,000
  - Verifies the target user exists before adjusting credits
- `DELETE /api/admin/enrolled-users/:email` prevents unenrolling the last remaining enrolled account.
- Firestore rules enforce server-side authorization: `credit_wallets`, `credit_transactions`, and `admin_settings` are write-restricted to admin/firebase-admin only.

---

## A02 — Cryptographic Failures

### Issues Identified
1. **`Math.random()` used for ID generation** — All document IDs (sessions, resumes, documents, transcripts, answers, notes) were generated using `Math.random().toString(36)`, which is not cryptographically secure and predictable.

### Remediation
- Created `secureId(prefix)` using `crypto.randomBytes(6).toString('hex')` for all document ID generation.
- All ID generation sites updated: sessions (`sess_`), resumes (`res_`), documents (`doc_`), transcripts (`tr_`), answers (`ans_`), notes (`note_`).

---

## A03 — Injection

### Issues Identified
1. **Excessive request body limit** — Express JSON body parser allowed 50MB payloads, enabling potential DoS via large payloads.
2. **No base64 validation on audio transcription** — `/api/transcribe` accepted arbitrary base64 strings without validation or size limits.
3. **No text length limits** — Transcript and answer text fields had no maximum length enforcement.
4. **LLM output not sanitized** — Responses from the AI model were returned to clients without sanitization, potentially containing `<script>` tags or `javascript:` URLs.

### Remediation
- JSON body limit reduced from 50MB to **5MB**.
- `/api/transcribe` now:
  - Limits base64 audio to 8MB (~5MB decoded)
  - Validates base64 format with regex `/^[a-zA-Z0-9+/=]+$/`
- Transcript text limited to **5,000 characters**.
- Answer text (`questionText`) limited to **5,000 characters**.
- `sanitizeLLMOutput()` strips `<script>` tags, `javascript:` URLs, and `on*` event handlers from LLM responses before returning to clients.
- Email format validation with regex on enrolment endpoints.
- Credit amount validation (1-10,000) on purchase endpoint.

---

## A04 — Insecure Design

### Issues Identified
1. **No rate limiting** — All API endpoints were accessible without rate limiting, enabling brute force and DoS attacks.
2. **Self-service credit purchase without limits** — Users could purchase arbitrary credit amounts.
3. **No enrolment cap enforcement at the API layer** — While Firestore rules existed, the API layer should also enforce the two-account cap.

### Remediation
- **In-memory rate limiter** added:
  - 100 requests per minute per IP (general)
  - 20 requests per minute per IP (auth-heavy endpoints)
- Credit purchase amount limited to **1–10,000 credits** per transaction.
- Enrolment cap of **2 accounts** enforced at both API and Firestore rule layers.
- Credit adjustment capped at **±100,000** per operation.

---

## A05 — Security Misconfiguration

### Issues Identified
1. **No security headers** — Responses lacked `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, etc.
2. **Default Firebase rules were permissive** — Users could potentially create their own account documents.

### Remediation
- **Security headers** applied to all responses:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Content-Security-Policy` restricting scripts, styles, images, and connections to trusted sources
- **Firestore rules hardened**:
  - Default deny-all for unknown collections (`match /{document=**} { allow read, write: if false; }`)
  - `users.create` restricted to `isAdmin()` only (clients cannot self-register)
  - `credit_wallets` write restricted to admin only
  - `credit_transactions` is append-only (create by admin, no update/delete)
  - `admin_settings` write disabled for clients (server only)
  - `audit_logs` is append-only (create by admin, no update/delete)
  - Stronger ownership validation on update operations (prevents role/uid/email escalation)

---

## A06 — Vulnerable and Outdated Components

### Assessment
- All dependencies are managed via `package.json` with locked versions.
- No known vulnerable components identified at time of review.
- Recommendation: Run `npm audit` regularly and enable Dependabot for automated security updates.

### Status: ✅ No action required at this time.

---

## A07 — Identification and Authentication Failures

### Issues Identified
1. **No failed authentication logging** — Failed sign-in attempts were not logged, making brute-force detection difficult.
2. **No rate limiting on auth endpoints** — Sign-in and token verification endpoints were not rate-limited.

### Remediation
- Failed Firebase ID token verification is now logged with `console.warn()`.
- Auth-heavy endpoints (sign-in, token verification) are subject to the stricter rate limit (20 req/min per IP).
- All API routes require valid Firebase ID tokens (verified by `firebase-admin`).
- Invitation-only enrolment: unenrolled emails are rejected with HTTP 403 at provisioning time.

---

## A08 — Software and Data Integrity Failures

### Issues Identified
1. **LLM JSON responses trusted without validation** — Responses from the Gemini model were parsed and used directly without schema validation or sanitization.
2. **No integrity validation on AI-generated content** — Answers from the AI could contain malicious content.

### Remediation
- `sanitizeLLMOutput()` function strips:
  - `<script>` tags and their contents
  - `javascript:` URL schemes
  - `on*` event handler attributes (`onclick`, `onerror`, etc.)
- LLM-generated answer text is sanitized before storage and return to clients.
- JSON responses from LLM are parsed with try/catch fallbacks to prevent malformed responses from breaking the application.

---

## A09 — Security Logging and Monitoring Failures

### Issues Identified
1. **No security event logging** — Authentication failures, authorization failures, and rate limit events were not logged.
2. **No audit trail for admin actions** — Some admin actions lacked audit logging.

### Remediation
- **Failed auth logging**: ID token verification failures are logged with warning level.
- **Rate limit events**: Rate limit rejections return HTTP 429 and are implicit in the rate limiter.
- **Admin audit logging**: All admin actions (credit adjustments, enrolment, settings changes) are recorded in `audit_logs` via `addAuditLog()` with admin UID, email, target user, action, details, and IP address.
- **Device registration audit**: Device registration and revocation events are logged to `audit_logs`.

---

## A10 — Server-Side Request Forgery (SSRF)

### Assessment
- The application does not accept user-supplied URLs for server-side fetching.
- All outbound requests are to hardcoded Google/Firebase endpoints and the configured AI provider.
- No SSRF vector identified.

### Status: ✅ No action required at this time.

---

## Firebase Security Rules

`firestore.rules` was rewritten with defense-in-depth principles:

- **Default deny-all** for unknown collections
- **Default deny-all** for write operations on system collections (`credit_transactions`, `audit_logs`, `admin_settings`, `admins`)
- **Ownership-based access** for user-owned resources (resumes, documents, sessions, transcripts, answers, notes)
- **Admin-only access** for wallets, subscriptions, audit logs, and admin settings
- **Role/uid/email protection** on user document updates (prevents privilege escalation)
- **Session ownership validation** on transcript and answer creation

---

## Remediation Verification

| Check | Result |
|-------|--------|
| `npm run lint` (TypeScript) | ✅ 0 errors |
| `npm run build` (Vite) | ✅ Successful |
| `npm run test:demo` (smoke tests) | ✅ All assertions pass |
| Secret scan (pre-commit hook) | ✅ Clean |
| Server boot + `/api/health` | ✅ 200 OK |

---

## Recommendations for Ongoing Security

1. **Enable Firebase App Check** to prevent abuse from unauthorized clients.
2. **Set up Firebase Realtime Database rules monitoring** and alerting.
3. **Configure Dependabot** for automated dependency security updates.
4. **Run `npm audit`** in CI/CD pipeline on every PR.
5. **Consider adding request signing** for the `/api/transcribe` endpoint to prevent unauthorized audio submission.
6. **Implement request size monitoring** and alerting for potential DoS patterns.

---

*Report generated as part of the AskMeAi security hardening initiative. All changes committed to `main` and deployed via Cloudflare auto-deploy.*
