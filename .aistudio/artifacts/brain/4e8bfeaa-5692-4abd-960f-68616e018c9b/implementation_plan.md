# AI Interview Copilot — Platform Architecture & Implementation Plan

An enterprise-grade, real-time AI Interview Copilot platform inspired by the observable capabilities of ParakeetAI. The system provides speech-to-text audio ingestion, automatic interview question detection, resume & knowledge base RAG retrieval, structured STAR-method AI answer streaming, a dedicated coding interview workspace, session summarization, credit/subscription billing, desktop floating companion HUD, and a role-based administrative console.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Please review the architecture, database schema, external integrations, and phased roadmap below. Once approved by clicking **Proceed**, we will systematically execute the roadmap phase-by-phase without shortcuts or mock stubs.

- **Audio Capture Strategy**: Dual-mode audio pipeline:
  1. Primary Browser-Native: Web Audio API + Web Speech API for zero-latency local speech-to-text and `getDisplayMedia({ audio: true })` for capturing system/meeting audio (Zoom, Google Meet, Teams).
  2. Fallback / Deep Transcription: Server-side Gemini 3.5 Audio Transcription streaming via WebSocket / SSE for multi-speaker recognition and noisy environments.
- **AI Model Pipeline**: Configured on the backend using `@google/genai`:
  - `gemini-3.8-flash`: Real-time question detection, intent classification, and streaming conversational/STAR answers.
  - `gemini-4-argon`: Complex algorithm analysis, code optimization, and deep technical problem-solving.
- **Data Persistence & Database Architecture**:
  - Full-stack Express backend (`server.ts`) with robust in-memory / Firestore client adapters handling 18 collections with transactional credit deduction and audit logging.
  - Firebase Auth & Firestore rules configuration ready for multi-device session limits (1 desktop + 1 mobile).
- **Desktop Companion**:
  - Web-embedded "Floating HUD Mode" (picture-in-picture/compact floating window with translucent glass HUD, keyboard shortcuts, and minimizable views) plus production-ready Electron main/preload IPC architecture files for native desktop builds.

---

## 1. Overview & Core Concept

### What It Does
AI Interview Copilot operates alongside candidates during live technical, behavioral, and system design interviews. It listens to interviewer questions in real-time, classifies the question type (behavioral, technical concept, coding algorithm, or casual small-talk), retrieves context from the candidate's uploaded resumes and knowledge documents, and streams structured, authentic answer suggestions (such as STAR method or code solutions) onto a distraction-free, floating assistant HUD.

### Target Audience & Persona
- Software engineers, product managers, data scientists, and engineering leaders preparing for or conducting high-stakes technical and behavioral interviews.
- Candidates who need structured talking points aligned with their actual background, not generic or fabricated answers.

### Core Value
- Eliminates interview cognitive freeze by surfacing relevant project examples from the user's authentic career history in real-time.
- Provides immediate algorithmic breakdowns, edge case alerts, and time/space complexity analysis for coding challenges.

---

## 2. Technical Architecture & System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND CLIENT TIERS                              │
│                                                                                 │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────┐  │
│  │     Main Dashboard      │  │   Live Interview HUD    │  │ Coding Sandbox  │  │
│  │ (Credits, Stats, Vault) │  │(Audio, STT, AI Answers) │  │ (Monaco/Editor) │  │
│  └────────────┬────────────┘  └────────────┬────────────┘  └────────┬────────┘  │
│               │                            │                        │           │
│  ┌────────────┴────────────┐  ┌────────────┴────────────┐           │           │
│  │    Resume & KB Vault    │  │  Floating Desktop HUD   │           │           │
│  │  (PDF/DOCX RAG Parsing) │  │  (Always-on-top, Hotkey)│           │           │
│  └────────────┬────────────┘  └────────────┬────────────┘           │           │
└───────────────┼────────────────────────────┼────────────────────────┼───────────┘
                │                            │                        │
                ▼                            ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      SECURE SERVER-SIDE BACKEND (Express / tsx)                 │
│                                                                                 │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────────┐  │
│  │  /api/session/stream  │  │   /api/rag/query      │  │ /api/coding/analyze │  │
│  │  (SSE / WebSockets)   │  │  (Vector / TF-IDF RAG)│  │ (Syntax/Complexity) │  │
│  └───────────┬───────────┘  └───────────┬───────────┘  └──────────┬──────────┘  │
│              │                          │                         │             │
│  ┌───────────┴───────────┐  ┌───────────┴───────────┐  ┌──────────┴──────────┐  │
│  │  /api/billing/wallet  │  │   /api/auth/session   │  │   /api/admin/audit  │  │
│  │ (Credits Transaction) │  │(1 Desktop + 1 Mobile) │  │ (RBAC & Usage Logs) │  │
│  └───────────┬───────────┘  └───────────┬───────────┘  └──────────┬──────────┘  │
└──────────────┼──────────────────────────┼─────────────────────────┼─────────────┘
               │                          │                         │
               ▼                          ▼                         ▼
┌───────────────────────────────┐ ┌──────────────────────────────┐ ┌──────────────┐
│       AI ENGINE PROVIDER      │ │     FIRESTORE / DATABASE     │ │   STRIPE /   │
│  @google/genai SDK            │ │ 18 Hardened Collections      │ │   PAYMENTS   │
│  - gemini-3.8-flash (Q&A/STAR)│ │ - Users, Wallets, Sessions   │ │ - Checkout   │
│  - gemini-4-argon (Coding)    │ │ - Transcripts, Resumes, RAG  │ │ - Webhooks   │
└───────────────────────────────┘ └──────────────────────────────┘ └──────────────┘
```

---

## 3. Complete Module Breakdown

### Module A: Authentication & User Management
- Email/password authentication, Google OAuth integration, email verification.
- Active session enforcement: Allows 1 active desktop session and 1 active mobile session per user. Additional logins prompt session revocation.
- Profile management, login history with IP/device user-agent logging, and GDPR-compliant account deletion.

### Module B: Main Dashboard
- High-level executive statistics: Available credits, total session time, active subscription tier.
- Quick-action launcher: "Start Live Session", "Open Coding Assistant", "Upload Resume/Doc".
- Recent session grid with transcripts preview, performance score, and exported notes.
- Document and resume count badges with status indicators.

### Module C: AI Live Interview Session
- Microphone selector with real-time audio volume visualizer (HTML5 Web Audio API Analyzer).
- Audio source selector: System Audio (Meeting Screen/Tab Capture) and Microphone.
- Real-time Speech-to-Text streaming with live speaker separation indicators (Interviewer vs Candidate).
- Question Detection Filter: Uses heuristics and confidence thresholds to distinguish questions from normal chatter, greetings, or acknowledgments.
- Real-time Answer Card: Live streaming generation with copy, bookmark, regenerate, and style switcher (STAR, Concise, Detailed, Technical).
- Active session timer, remaining credits ticker, and one-click session pause/resume/end.

### Module D: AI Answer Engine & Answer Personas
- STAR Answer Pipeline:
  - **Situation**: Contextual background based on real resume accomplishments.
  - **Task**: The candidate's specific objective and problem statement.
  - **Action**: Concrete technical tools, leadership decisions, and steps taken.
  - **Result**: Quantifiable business impact and lessons learned.
- Answer Modes:
  - *Concise*: Bulleted elevator pitch (under 60 words).
  - *STAR*: Behavioral deep-dive.
  - *Technical Deep-Dive*: System architecture, design tradeoffs, and failure modes.
  - *Step-by-Step*: Structured troubleshooting guide.

### Module E: Coding Interview Assistant
- Dual-panel IDE workspace: Code editor with line numbers, syntax highlighting, language selector (Python, TypeScript, JavaScript, Java, C++, Go, Rust).
- Problem Ingestion: Paste problem text, speech detection, or problem description prompt.
- AI Code Analysis:
  - Algorithm approach and brute-force vs optimal solution breakdown.
  - Time complexity ($O(N)$) and space complexity ($O(1)$) analysis.
  - Bug detection and test-case edge case generator.
  - Step-by-step code walkthrough.

### Module F: Resume Intelligence & Extraction
- Multi-format file uploader (PDF, DOCX, TXT) with client/server validation (10MB limit).
- Text extraction pipeline extracting: Contact info, work history timeline, technical skill taxonomy, key project achievements.
- Resume profile switcher: Users can designate a primary resume or tag resumes to specific interview roles (e.g., "Senior Frontend Engineer" vs "Staff Platform Architect").

### Module G: Knowledge Base RAG (Retrieval-Augmented Generation)
- Document manager: Company research notes, job descriptions, technical glossaries, brag sheets.
- Chunking & Retrieval: Content splitting into 500-token chunks with semantic search and TF-IDF / vector matching.
- Grounding: Answer generation prioritizes the user's authentic facts and prevents fabricated experiences.

### Module H: Meeting Detection & Audio Routing
- Audio capture manager supporting:
  - Direct microphone capture (`getUserMedia`).
  - System / Meeting Audio capture (`getDisplayMedia` with system audio loopback for Zoom, Google Meet, Microsoft Teams, and Webex).
- Transparent privacy indicator informing the user that audio is processed locally and in memory without unauthorized surveillance.

### Module I: AI Session Notes & Summary
- Automatic post-session generation:
  - Executive Meeting Summary.
  - Chronological Questions & Answers table.
  - Technical concepts tested.
  - Strengths and areas for improvement.
  - Follow-up action items and thank-you email draft.
- Export options: Markdown (.md), PDF download, clipboard copy.

### Module J: Desktop Companion & Floating HUD
- Compact Floating HUD mode:
  - Minimizable translucent window designed to sit next to video calls.
  - Global keyboard hotkeys: `Cmd/Ctrl + Shift + Space` (Toggle answer panel), `Cmd/Ctrl + Shift + Q` (Force answer generation).
  - High-contrast, glanceable typography with auto-scroll and quick-copy buttons.
  - Electron-compatible build configuration and IPC security model.

### Module K: Mobile Responsive Experience
- Adaptive mobile interface with touch-optimized controls, mobile mic permission handling, and condensed answer card cards.

### Module L: Billing & Credit Management
- Credit Wallet: Real-time balance deducted on a per-minute or per-question basis.
- Subscriptions: Free Starter, Pro Monthly ($29/mo), and Executive Unlimited ($79/mo).
- Transaction History: Immutable ledger of credit purchases, session deductions, and refunds.
- Stripe-ready integration with webhook signature verification.

### Module M: Admin Console (RBAC)
- Multi-role authorization: `Super Admin`, `Admin`, `Support`, `User`.
- User directory with status toggles, credit adjustment dialog, and session drilldown.
- AI token consumption graphs, cost telemetry, model provider selector, and audit logs.

---

## 4. Comprehensive Database Schema (18 Collections)

1. `users`: `{ uid, email, displayName, photoURL, role, emailVerified, createdAt, updatedAt }`
2. `user_devices`: `{ id, userId, deviceType: 'desktop'|'mobile', userAgent, ipAddress, lastActiveAt, sessionToken }`
3. `credit_wallets`: `{ userId, balanceCredits, lifetimePurchased, lifetimeSpent, updatedAt }`
4. `credit_transactions`: `{ id, userId, amount, type: 'purchase'|'session_deduction'|'admin_grant'|'refund', balanceAfter, description, referenceId, createdAt }`
5. `subscriptions`: `{ id, userId, planTier: 'starter'|'pro'|'executive', status: 'active'|'canceled'|'past_due', currentPeriodEnd, stripeCustomerId, stripeSubscriptionId }`
6. `payments`: `{ id, userId, amount, currency, status, paymentMethod, stripePaymentIntentId, createdAt }`
7. `invoices`: `{ id, userId, invoiceNumber, amount, pdfUrl, status, createdAt }`
8. `resumes`: `{ id, userId, fileName, fileUrl, fileSizeBytes, extractedText, parsedProfile: { skills, experience, education }, isPrimary, createdAt }`
9. `documents`: `{ id, userId, title, category: 'company_research'|'job_description'|'notes', fileSizeBytes, createdAt }`
10. `knowledge_chunks`: `{ id, documentId, userId, chunkIndex, content, tokenCount, metadata }`
11. `sessions`: `{ id, userId, resumeId, targetRole, targetCompany, status: 'active'|'paused'|'completed', startedAt, endedAt, totalDurationSeconds, creditsDeducted }`
12. `session_transcripts`: `{ id, sessionId, userId, speaker: 'interviewer'|'candidate', text, confidence, timestamp }`
13. `session_answers`: `{ id, sessionId, userId, questionText, questionCategory: 'behavioral'|'technical'|'coding'|'smalltalk', answerText, answerStyle, contextUsed, createdAt }`
14. `session_notes`: `{ id, sessionId, userId, summary, keyTopics, actionItems, strengths, improvements, createdAt }`
15. `ai_usage`: `{ id, userId, sessionId, modelName, promptTokens, completionTokens, totalTokens, estimatedCostUsd, createdAt }`
16. `admin_settings`: `{ id, activeAiProvider, defaultModel, costPerCreditUsd, creditsPerSessionMinute, maintenanceMode, updatedAt }`
17. `audit_logs`: `{ id, adminUserId, targetUserId, action, payloadSummary, ipAddress, timestamp }`
18. `support_tickets`: `{ id, userId, subject, message, status: 'open'|'in_progress'|'resolved', priority, createdAt }`

---

## 5. Third-Party APIs, Paid Services & Permission Requirements

| Service / API | Purpose | Execution Mode | Requirements |
|---|---|---|---|
| **Google Gemini API** (`@google/genai`) | STT analysis, question detection, STAR answers, code optimization | Server-Side Proxy (`server.ts`) | `GEMINI_API_KEY` (Free / Paid tier) |
| **Web Audio / MediaStream API** | Local microphone capture & waveform visualization | Client-Side Browser | Browser microphone permission |
| **Screen / Tab Capture API** | Meeting audio loopback (Zoom, Meet, Teams audio) | Client-Side Browser | User confirmation dialog (`getDisplayMedia`) |
| **Web Speech Recognition** | Real-time low latency local client transcription | Client-Side Browser | Chromium-based browser engine |
| **Stripe Payments** | Subscriptions and credit pack purchases | Server + Client Webhooks | Stripe API Key & Webhook Secret |
| **Firebase Auth & Firestore** | Cloud identity & persistence | SDK Client & Admin | Firebase project credentials |

---

## 6. Technical Limitations & Mitigation Strategies

1. **Meeting Audio Capture in Web Browsers**:
   - *Limitation*: Web browsers cannot invisibly capture other desktop applications' audio.
   - *Mitigation*: Use standard browser `navigator.mediaDevices.getDisplayMedia({ audio: true })` tab/window sharing with clear instructions for the user to select the meeting window or tab. Provide an Electron desktop configuration for native audio routing.
2. **Audio Streaming Latency**:
   - *Limitation*: Waiting for an entire speech sentence before requesting an AI response introduces a 3-5 second delay.
   - *Mitigation*: Stream tokens immediately using Server-Sent Events (SSE). Use heuristic question detection so the model starts formulating bullet points the moment an interrogative pattern is detected.
3. **Hallucination Prevention**:
   - *Limitation*: LLMs may fabricate past companies, metrics, or technologies not present in the user's career.
   - *Mitigation*: System prompt engineering strictly binds behavioral answers to the user's parsed resume and knowledge documents. If a question asks about an unlisted technology, the AI instructs the candidate how to frame their transferable skills truthfully.

---

## 7. Phased Implementation Roadmap

- **Phase 1: Foundation & Architecture Setup**
  - Full-stack Express server (`server.ts`) with Vite integration.
  - Design system tokens, navigation shell, and responsive layout.
  - Multi-collection database store and session state management.
- **Phase 2: Live Interview Session & Real-Time Answer Engine**
  - Audio capture pipeline with visual waveform and speaker differentiation.
  - Question detection filter and streaming STAR answer engine via `@google/genai`.
  - Floating HUD companion mode with hotkeys.
- **Phase 3: Resume Intelligence & Knowledge Base RAG**
  - Document upload, text extraction, profile parser, and semantic chunk retrieval.
- **Phase 4: Coding Interview Assistant**
  - Interactive code editor, algorithm analyzer, syntax validator, and complexity analysis.
- **Phase 5: Session Summary & AI Notes Synthesis**
  - Post-interview report generator, PDF/Markdown exporter, and action item extractor.
- **Phase 6: Billing, Credit Wallet & Transactional Ledger**
  - Credit purchase flows, rate deductions, subscription plan management, and Stripe hooks.
- **Phase 7: Administration, RBAC & Audit Logging**
  - Admin management console, AI token analytics, and audit log explorer.
- **Phase 8: Verification, Linting & Production Build**
  - TypeScript compilation, linting verification, and end-to-end workflow validation.
