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
    const res = await fetch(`/api/me${userId ? `?userId=${userId}` : ''}`);
    if (!res.ok) throw new Error('Failed to load application state');
    return res.json();
  },

  async registerDevice(deviceType: 'desktop' | 'mobile', deviceName: string) {
    const res = await fetch('/api/auth/register-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceType, deviceName }),
    });
    return res.json();
  },

  async revokeDevice(deviceId: string) {
    const res = await fetch('/api/auth/revoke-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    });
    return res.json();
  },

  // Wallet & Billing
  async purchaseCredits(creditsAmount: number, packName: string) {
    const res = await fetch('/api/wallet/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creditsAmount, packName }),
    });
    return res.json();
  },

  async getTransactions(): Promise<CreditTransaction[]> {
    const res = await fetch('/api/wallet/transactions');
    return res.json();
  },

  async updateSubscription(planTier: 'starter' | 'pro' | 'executive') {
    const res = await fetch('/api/subscriptions/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planTier }),
    });
    return res.json();
  },

  // Resumes
  async uploadResume(data: {
    fileName: string;
    fileContentBase64?: string;
    textContent?: string;
    fileType?: string;
  }): Promise<Resume> {
    const res = await fetch('/api/resumes/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to upload resume');
    }
    return res.json();
  },

  async setPrimaryResume(id: string) {
    const res = await fetch(`/api/resumes/${id}/primary`, { method: 'POST' });
    return res.json();
  },

  async deleteResume(id: string) {
    const res = await fetch(`/api/resumes/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Knowledge Documents
  async uploadDocument(data: { title: string; category: string; content: string }): Promise<KnowledgeDocument> {
    const res = await fetch('/api/documents/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to save document');
    return res.json();
  },

  async deleteDocument(id: string) {
    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Sessions
  async createSession(data: {
    targetRole: string;
    targetCompany: string;
    resumeId?: string;
  }): Promise<InterviewSession> {
    const res = await fetch('/api/sessions/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create session');
    }
    return res.json();
  },

  async updateSessionStatus(id: string, status: string, durationDelta = 0): Promise<InterviewSession> {
    const res = await fetch(`/api/sessions/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, durationDelta }),
    });
    return res.json();
  },

  async getSessionData(id: string): Promise<{
    session: InterviewSession;
    transcripts: TranscriptLine[];
    answers: SessionAnswer[];
    notes?: SessionNotes;
  }> {
    const res = await fetch(`/api/sessions/${id}/data`);
    if (!res.ok) throw new Error('Failed to load session data');
    return res.json();
  },

  async submitTranscript(sessionId: string, speaker: 'interviewer' | 'candidate', text: string): Promise<TranscriptLine> {
    const res = await fetch(`/api/sessions/${sessionId}/transcript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speaker, text }),
    });
    if (!res.ok) throw new Error('Failed to submit transcript');
    return res.json();
  },

  async generateAnswer(
    sessionId: string,
    questionText: string,
    answerStyle = 'star',
    customHint?: string
  ): Promise<SessionAnswer> {
    const res = await fetch(`/api/sessions/${sessionId}/generate-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionText, answerStyle, customHint }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to generate answer');
    }
    return res.json();
  },

  // Coding Analysis
  async analyzeCode(data: {
    title: string;
    description: string;
    language: string;
    userCode: string;
  }) {
    const res = await fetch('/api/coding/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Coding analysis failed');
    return res.json();
  },

  async executeCode(code: string, language: string, testCases?: any[]) {
    const res = await fetch('/api/coding/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, testCases }),
    });
    return res.json();
  },

  // Notes
  async generateNotes(sessionId: string): Promise<SessionNotes> {
    const res = await fetch('/api/notes/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    if (!res.ok) throw new Error('Failed to generate notes');
    return res.json();
  },

  // Admin
  async getAdminOverview() {
    const res = await fetch('/api/admin/overview');
    return res.json();
  },

  async getAdminUsers() {
    const res = await fetch('/api/admin/users');
    return res.json();
  },

  async adjustCredits(targetUserId: string, amount: number, reason: string) {
    const res = await fetch('/api/admin/adjust-credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId, amount, reason }),
    });
    return res.json();
  },

  async getAdminAuditLogs(): Promise<AuditLog[]> {
    const res = await fetch('/api/admin/audit-logs');
    return res.json();
  },

  async getAdminSettings(): Promise<AdminSettings> {
    const res = await fetch('/api/admin/settings');
    return res.json();
  },

  async updateAdminSettings(settings: Partial<AdminSettings>): Promise<AdminSettings> {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.json();
  },
};
