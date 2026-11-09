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
  AuditLog,
} from '../types';
import { getAuthToken, refreshAuthToken } from './authToken';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
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

async function toError(res: Response, fallback: string): Promise<ApiError> {
  let message = fallback;
  try {
    const body = await res.json();
    if (body?.error) message = body.error;
  } catch {
    /* non-JSON error body */
  }
  return new ApiError(res.status, message);
}

async function json<T = any>(path: string, init: RequestInit = {}, fallback = 'Request failed'): Promise<T> {
  const res = await request(path, init);
  if (!res.ok) throw await toError(res, fallback);
  return res.json();
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

  async submitTranscript(sessionId: string, speaker: 'interviewer' | 'candidate', text: string): Promise<TranscriptLine> {
    return json(`/api/sessions/${sessionId}/transcript`, post(`/api/sessions/${sessionId}/transcript`, { speaker, text }), 'Failed to submit transcript');
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
};
