import {
  User,
  CreditWallet,
  CreditTransaction,
  Subscription,
  Resume,
  KnowledgeDocument,
  InterviewSession,
  TranscriptLine,
  SessionAnswer,
  SessionNotes,
  UserDevice,
  AdminSettings,
  EnrolledUser,
  UserRole,
  AuditLog,
} from '../types';
import { getAuthToken, refreshAuthToken } from './authToken';
import { demoFetch } from './demoApi';

export class ApiError extends Error {
  status: number;
  /** Machine-readable detail, e.g. `backend-missing`. */
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'ApiError';
  }
}

/**
 * The API always answers JSON. Anything else (almost always index.html) means
 * there is no backend behind this URL - the page is being served by a static
 * server such as `npm run preview` instead of by the Express app that owns /api.
 */
export const BACKEND_MISSING_MESSAGE = import.meta.env.DEV
  ? 'Could not reach the AskMeAi API: this page is being served without its backend. ' +
    'Run `npm run dev` (or `NODE_ENV=production npm start`) and open the URL it prints. ' +
    '`npm run preview` only serves the built UI and has no API.'
  : 'The AskMeAi service is temporarily unavailable. Please try again in a moment.';

/**
 * Demo mode: this page has no API behind it, so requests are answered by the
 * in-browser backend (demoApi.ts) instead of the network. Sticky for the life
 * of the page - once proven absent, the backend does not reappear.
 */
let demoMode = false;
const demoListeners = new Set<(active: boolean) => void>();

export function isDemoMode(): boolean {
  return demoMode;
}

export function setDemoMode(active: boolean): void {
  if (demoMode === active) return;
  demoMode = active;
  demoListeners.forEach((listener) => listener(active));
}

/** Subscribe to demo-mode flips (used by AuthContext to drive its UI). */
export function onDemoModeChange(listener: (active: boolean) => void): () => void {
  demoListeners.add(listener);
  return () => {
    demoListeners.delete(listener);
  };
}

/**
 * True when a response body is this app's own SPA shell. Our Express server
 * never answers an /api path with HTML (it returns JSON 401/400/404), so this
 * is proof positive the request never reached a backend.
 */
export function looksLikeSpaShell(body: string): boolean {
  if (!body) return false;
  const head = body.slice(0, 600).toLowerCase();
  if (!head.includes('<!doctype html') && !head.includes('<html')) return false;
  return body.includes('id="root"') || /<title>\s*AskMeAi/i.test(body);
}

/**
 * Auth-aware fetch: attaches the Firebase ID token and transparently retries
 * once with a refreshed token when the server answers 401.
 */
async function request(path: string, init: RequestInit = {}, allowRefresh = true): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = await getAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(path, { ...init, headers });

  if (res.status === 401 && token && allowRefresh) {
    const fresh = await refreshAuthToken();
    if (fresh) return request(path, init, false);
  }
  return res;
}

async function json<T = any>(path: string, init: RequestInit = {}, fallback = 'Request failed'): Promise<T> {
  // No backend behind this URL: answer locally instead of hitting a static
  // server that can only reply with HTML or 405s for POSTs.
  if (demoMode) return (await demoFetch(path, init)) as T;

  const res = await request(path, init);
  const text = (await res.text()).trim();

  // Parse defensively: only a JSON document is a valid API answer.
  let body: any = null;
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (body === null) {
    if (res.ok && text === '') return {} as T; // 204-style empty success

    // Non-JSON (usually our own SPA shell): the request never reached the API.
    // Report it instead of falling back to demo data, so a signed-in user is
    // never shown sample data in place of their account. The App offers
    // "Retry" and an explicit "Explore the demo instead".
    throw new ApiError(res.status, BACKEND_MISSING_MESSAGE, 'backend-missing');
  }

  if (!res.ok) throw new ApiError(res.status, body?.error || fallback);
  return body as T;
}

function post(_path: string, body?: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(body ?? {}) };
}

export const api = {
  // Session & Auth
  async getInitialState(userId?: string): Promise<{
    user: User;
    devices: UserDevice[];
    wallet: CreditWallet;
    subscription: Subscription;
    resumes: Resume[];
    documents: KnowledgeDocument[];
    sessions: InterviewSession[];
    /** Configured AI model pool (primary first) — powers the wizard's model row. */
    aiModels?: string[];
  }> {
    return json(`/api/me${userId ? `?userId=${userId}` : ''}`, {}, 'Failed to load application state');
  },

  async registerDevice(deviceType: 'desktop' | 'mobile', deviceName: string) {
    return json('/api/auth/register-device', post('/api/auth/register-device', { deviceType, deviceName }), 'Device registration failed');
  },

  async revokeDevice(deviceId: string) {
    return json('/api/auth/revoke-device', post('/api/auth/revoke-device', { deviceId }), 'Failed to revoke device');
  },

  // Wallet & Billing
  async purchaseCredits(creditsAmount: number, packName: string) {
    return json('/api/wallet/purchase', post('/api/wallet/purchase', { creditsAmount, packName }), 'Purchase failed');
  },

  async getTransactions(): Promise<CreditTransaction[]> {
    return json('/api/wallet/transactions', {}, 'Failed to load transactions');
  },

  async updateSubscription(planTier: 'starter' | 'pro' | 'executive') {
    return json('/api/subscriptions/update', post('/api/subscriptions/update', { planTier }), 'Failed to update plan');
  },

  // Resumes
  async uploadResume(data: {
    fileName: string;
    fileContentBase64?: string;
    textContent?: string;
    fileType?: string;
  }): Promise<Resume> {
    return json('/api/resumes/upload', post('/api/resumes/upload', data), 'Failed to upload resume');
  },

  async setPrimaryResume(id: string) {
    return json(`/api/resumes/${id}/primary`, post(`/api/resumes/${id}/primary`), 'Failed to set primary resume');
  },

  async deleteResume(id: string) {
    return json(`/api/resumes/${id}`, { method: 'DELETE' }, 'Failed to delete resume');
  },

  // Knowledge Documents
  async uploadDocument(data: { title: string; category: string; content: string }): Promise<KnowledgeDocument> {
    return json('/api/documents/upload', post('/api/documents/upload', data), 'Failed to save document');
  },

  async deleteDocument(id: string) {
    return json(`/api/documents/${id}`, { method: 'DELETE' }, 'Failed to delete document');
  },

  // Sessions
  async createSession(data: {
    targetRole: string;
    targetCompany: string;
    resumeId?: string;
    mode?: 'interview' | 'meeting';
    instructions?: string;
    language?: string;
    /** Wizard preferences (ParakeetAI parity) */
    answerStyle?: string;
    autoAnswer?: boolean;
    saveTranscript?: boolean;
    model?: string;
  }): Promise<InterviewSession> {
    return json('/api/sessions/create', post('/api/sessions/create', data), 'Failed to create session');
  },

  async updateSessionStatus(id: string, status: string, durationDelta = 0): Promise<InterviewSession> {
    return json(`/api/sessions/${id}/status`, post(`/api/sessions/${id}/status`, { status, durationDelta }), 'Failed to update session');
  },

  async getSessionData(id: string): Promise<{
    session: InterviewSession;
    transcripts: TranscriptLine[];
    answers: SessionAnswer[];
    notes?: SessionNotes;
  }> {
    return json(`/api/sessions/${id}/data`, {}, 'Failed to load session data');
  },

  async submitTranscript(sessionId: string, speaker: 'interviewer' | 'candidate', text: string): Promise<{ line: TranscriptLine; answer?: SessionAnswer } | TranscriptLine> {
    return json(`/api/sessions/${sessionId}/transcript`, post(`/api/sessions/${sessionId}/transcript`, { speaker, text }), 'Failed to submit transcript');
  },

  /** Server-side speech-to-text for meeting audio (captures interviewer on the other side). */
  async transcribeAudio(audioBase64: string, mimeType: string): Promise<{ text: string }> {
    return json('/api/transcribe', post('/api/transcribe', { audioBase64, mimeType }), 'Failed to transcribe audio');
  },

  async generateAnswer(
    sessionId: string,
    questionText: string,
    answerStyle = 'star',
    customHint?: string
  ): Promise<SessionAnswer> {
    return json(
      `/api/sessions/${sessionId}/generate-answer`,
      post(`/api/sessions/${sessionId}/generate-answer`, { questionText, answerStyle, customHint }),
      'Failed to generate answer'
    );
  },

  // Coding Analysis
  async analyzeCode(data: {
    title: string;
    description: string;
    language: string;
    userCode: string;
  }) {
    return json('/api/coding/analyze', post('/api/coding/analyze', data), 'Coding analysis failed');
  },

  async executeCode(code: string, language: string, testCases?: any[]) {
    return json('/api/coding/execute', post('/api/coding/execute', { code, language, testCases }), 'Code execution failed');
  },

  // Notes
  async generateNotes(sessionId: string): Promise<SessionNotes> {
    return json('/api/notes/generate', post('/api/notes/generate', { sessionId }), 'Failed to generate notes');
  },

  // Screenshot / photo of a question -> grounded answer (multimodal)
  async answerFromImage(
    sessionId: string,
    data: { imageBase64: string; mimeType?: string; answerStyle?: string; customHint?: string }
  ): Promise<SessionAnswer> {
    return json(
      `/api/sessions/${sessionId}/answer-from-image`,
      post(`/api/sessions/${sessionId}/answer-from-image`, data),
      'Failed to answer from image'
    );
  },

  // Mock Interview (stateless AI interviewer)
  async mockNextQuestion(data: {
    role: string;
    company?: string;
    difficulty?: string;
    language?: string;
    history?: { question: string; score?: number }[];
  }): Promise<{ question: string; category: string; round: number }> {
    return json('/api/mock/next-question', post('/api/mock/next-question', data), 'Failed to fetch question');
  },

  async mockEvaluate(data: {
    question: string;
    answer: string;
    role: string;
    company?: string;
    language?: string;
  }): Promise<{
    score: number;
    verdict: string;
    strengths: string[];
    improvements: string[];
    improvedAnswer: string;
    followUpHint: string;
  }> {
    return json('/api/mock/evaluate', post('/api/mock/evaluate', data), 'Failed to evaluate answer');
  },

  // Admin
  async getAdminOverview() {
    return json('/api/admin/overview', {}, 'Failed to load admin overview');
  },

  async getAdminUsers() {
    return json('/api/admin/users', {}, 'Failed to load users');
  },

  async adjustCredits(targetUserId: string, amount: number, reason: string) {
    return json('/api/admin/adjust-credits', post('/api/admin/adjust-credits', { targetUserId, amount, reason }), 'Failed to adjust credits');
  },

  async getAdminAuditLogs(): Promise<AuditLog[]> {
    return json('/api/admin/audit-logs', {}, 'Failed to load audit logs');
  },

  async getAdminSettings(): Promise<AdminSettings> {
    return json('/api/admin/settings', {}, 'Failed to load settings');
  },

  async updateAdminSettings(settings: Partial<AdminSettings>): Promise<AdminSettings> {
    return json('/api/admin/settings', post('/api/admin/settings', settings), 'Failed to save settings');
  },

  // Invitation-only enrolment (admin)
  async getAdminEnrolledUsers(): Promise<EnrolledUser[]> {
    return json('/api/admin/enrolled-users', {}, 'Failed to load enrolled users');
  },

  async inviteEnrolledUser(email: string, role: UserRole = 'user') {
    return json('/api/admin/enrolled-users', post('/api/admin/enrolled-users', { email, role }), 'Failed to invite user');
  },

  async removeEnrolledUser(email: string) {
    return json(`/api/admin/enrolled-users/${encodeURIComponent(email)}`, { method: 'DELETE' }, 'Failed to remove enrolment');
  },

  // Clear all user data (GDPR / right to be forgotten)
  async clearUserData() {
    return json('/api/user/clear-data', { method: 'DELETE' }, 'Failed to clear user data');
  },
};
