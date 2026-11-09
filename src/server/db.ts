import fs from 'fs';
import path from 'path';
import {
  User,
  UserDevice,
  CreditWallet,
  CreditTransaction,
  Subscription,
  Resume,
  KnowledgeDocument,
  InterviewSession,
  TranscriptLine,
  SessionAnswer,
  SessionNotes,
  AdminSettings,
  AuditLog,
  SupportTicket,
} from '../types';
import { createDemoSeed, roleForEmail, DemoSeed } from './demoSeed';
import { PRIMARY_MODEL } from './gemini';
import {
  DataStore,
  CreditChangeResult,
  DeviceRegistrationResult,
  NewUserAccount,
  EnrollmentError,
} from './dataStore';

export interface DatabaseState {
  users: User[];
  devices: UserDevice[];
  wallets: Record<string, CreditWallet>;
  transactions: CreditTransaction[];
  subscriptions: Record<string, Subscription>;
  resumes: Resume[];
  documents: KnowledgeDocument[];
  sessions: InterviewSession[];
  transcripts: Record<string, TranscriptLine[]>;
  answers: Record<string, SessionAnswer[]>;
  notes: Record<string, SessionNotes>;
  adminSettings: AdminSettings;
  auditLogs: AuditLog[];
  supportTickets: SupportTicket[];
}

const DB_FILE = path.resolve(process.cwd(), 'data', 'database.json');

export const DEMO_USER_ID = 'user_dev_01';

const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  activeAiProvider: 'google_gemini',
  defaultModel: PRIMARY_MODEL,
  costPerCreditUsd: 0.1,
  creditsPerMinute: 1,
  maintenanceMode: false,
  maxSessionsPerUser: 10,
  // Invitation-only platform: enrolledEmails starts empty.
  // The first signer-up becomes super_admin via ensureUser bootstrap logic.
  enrolledEmails: [],
  updatedAt: new Date().toISOString(),
};

function stateFromSeed(seed: DemoSeed): DatabaseState {
  return {
    users: [seed.user],
    devices: seed.devices,
    wallets: { [seed.user.uid]: seed.wallet },
    transactions: seed.transactions,
    subscriptions: { [seed.user.uid]: seed.subscription },
    resumes: seed.resumes,
    documents: seed.documents,
    sessions: seed.sessions,
    transcripts: seed.transcripts,
    answers: seed.answers,
    notes: seed.notes,
    adminSettings: { ...DEFAULT_ADMIN_SETTINGS },
    auditLogs: seed.auditLogs,
    supportTickets: [],
  };
}

/** Seed state used when no local database.json exists yet. */
const INITIAL_STATE: DatabaseState = stateFromSeed(
  createDemoSeed(DEMO_USER_ID, 'platform@askmeai.local', 'Platform Owner', {})
);

export class Database implements DataStore {
  readonly kind = 'file' as const;
  private state: DatabaseState;

  constructor() {
    this.state = this.load();
  }

  private load(): DatabaseState {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Could not read existing database.json, initializing fresh store.', e);
    }
    this.save(INITIAL_STATE);
    return INITIAL_STATE;
  }

  public save(newState?: DatabaseState): void {
    if (newState) {
      this.state = newState;
    }
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write database file:', e);
    }
  }

  public getState(): Promise<DatabaseState> {
    return Promise.resolve(this.state);
  }

  // --- Users & Devices ---
  public async ensureUser(account: NewUserAccount): Promise<User> {
    const existing = this.state.users.find((u) => u.uid === account.uid);
    if (existing) {
      const changed =
        existing.email !== account.email ||
        existing.displayName !== account.displayName ||
        existing.photoURL !== account.photoURL ||
        existing.emailVerified !== account.emailVerified;
      if (changed) {
        existing.email = account.email;
        existing.displayName = account.displayName;
        existing.photoURL = account.photoURL;
        existing.emailVerified = account.emailVerified ?? existing.emailVerified;
        existing.updatedAt = new Date().toISOString();
        this.save();
      }
      return existing;
    }

    const seed = createDemoSeed(account.uid, account.email, account.displayName, {});
    // Bootstrap: if no admin exists yet, the first signer-up becomes super_admin.
    const existingAdmins = this.state.users.filter((u) =>
      u.role === 'super_admin' || u.role === 'admin'
    );
    const user: User = {
      ...seed.user,
      photoURL: account.photoURL,
      emailVerified: account.emailVerified ?? false,
      role: existingAdmins.length === 0 ? 'super_admin' : 'user',
    };
    this.state.users.push(user);
    this.state.wallets[account.uid] = seed.wallet;
    this.state.subscriptions[account.uid] = seed.subscription;
    this.state.resumes.push(...seed.resumes);
    this.state.documents.push(...seed.documents);
    this.state.sessions.push(...seed.sessions);
    this.state.transactions.push(...seed.transactions);
    Object.assign(this.state.transcripts, seed.transcripts);
    Object.assign(this.state.answers, seed.answers);
    Object.assign(this.state.notes, seed.notes);
    this.state.auditLogs.unshift(...seed.auditLogs);
    this.save();
    return user;
  }

  public async getUser(uid: string): Promise<User | undefined> {
    return this.state.users.find((u) => u.uid === uid);
  }

  public async getDevices(userId: string): Promise<UserDevice[]> {
    return this.state.devices.filter((d) => d.userId === userId);
  }

  public async registerDevice(
    userId: string,
    deviceType: 'desktop' | 'mobile',
    deviceName: string,
    userAgent: string,
    ipAddress: string
  ): Promise<DeviceRegistrationResult> {
    // 1 active desktop + 1 active mobile rule
    const existingSameType = this.state.devices.filter(
      (d) => d.userId === userId && d.deviceType === deviceType
    );
    let revokedOldDevice: UserDevice | undefined;

    if (existingSameType.length >= 1) {
      revokedOldDevice = existingSameType[0];
      // Revoke older devices of same type
      this.state.devices = this.state.devices.filter(
        (d) => !(d.userId === userId && d.deviceType === deviceType)
      );
    }

    const newDevice: UserDevice = {
      id: 'dev_' + Math.random().toString(36).substring(2, 9),
      userId,
      deviceType,
      deviceName,
      userAgent,
      ipAddress,
      lastActiveAt: new Date().toISOString(),
      sessionToken: 'tok_' + Math.random().toString(36).substring(2, 12),
      isCurrent: true,
    };

    this.state.devices.push(newDevice);
    this.save();
    return { device: newDevice, revokedOldDevice };
  }

  public async revokeDevice(deviceId: string, userId: string): Promise<boolean> {
    const initialLen = this.state.devices.length;
    this.state.devices = this.state.devices.filter(
      (d) => !(d.id === deviceId && d.userId === userId)
    );
    if (this.state.devices.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Wallet & Credits ---
  public async getWallet(userId: string): Promise<CreditWallet> {
    if (!this.state.wallets[userId]) {
      this.state.wallets[userId] = {
        userId,
        balanceCredits: 100, // 100 free welcome credits
        lifetimePurchased: 100,
        lifetimeSpent: 0,
        updatedAt: new Date().toISOString(),
      };
      this.save();
    }
    return this.state.wallets[userId];
  }

  public async deductCredits(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string
  ): Promise<CreditChangeResult> {
    const wallet = await this.getWallet(userId);
    if (wallet.balanceCredits < amount) {
      return {
        success: false,
        balanceAfter: wallet.balanceCredits,
        error: 'Insufficient credits. Please top up your wallet.',
      };
    }

    wallet.balanceCredits -= amount;
    wallet.lifetimeSpent += amount;
    wallet.updatedAt = new Date().toISOString();

    const tx: CreditTransaction = {
      id: 'tx_' + Math.random().toString(36).substring(2, 9),
      userId,
      amount: -amount,
      type: 'session_deduction',
      balanceAfter: wallet.balanceCredits,
      description,
      referenceId,
      createdAt: new Date().toISOString(),
    };
    this.state.transactions.unshift(tx);
    this.save();
    return { success: true, balanceAfter: wallet.balanceCredits };
  }

  public async addCredits(
    userId: string,
    amount: number,
    type: 'purchase' | 'admin_grant' | 'refund' | 'session_deduction',
    description: string
  ): Promise<CreditWallet> {
    const wallet = await this.getWallet(userId);
    wallet.balanceCredits += amount;
    if (type === 'purchase') {
      wallet.lifetimePurchased += amount;
    }
    wallet.updatedAt = new Date().toISOString();

    const tx: CreditTransaction = {
      id: 'tx_' + Math.random().toString(36).substring(2, 9),
      userId,
      amount,
      type,
      balanceAfter: wallet.balanceCredits,
      description,
      createdAt: new Date().toISOString(),
    };
    this.state.transactions.unshift(tx);
    this.save();
    return wallet;
  }

  public async getTransactions(userId: string): Promise<CreditTransaction[]> {
    return this.state.transactions.filter((tx) => tx.userId === userId);
  }

  // --- Subscriptions ---
  public async getSubscription(userId: string): Promise<Subscription> {
    if (!this.state.subscriptions[userId]) {
      this.state.subscriptions[userId] = {
        id: 'sub_' + Math.random().toString(36).substring(2, 9),
        userId,
        planTier: 'starter',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
        cancelAtPeriodEnd: false,
      };
      this.save();
    }
    return this.state.subscriptions[userId];
  }

  public async updateSubscription(
    userId: string,
    planTier: 'starter' | 'pro' | 'executive'
  ): Promise<Subscription> {
    const sub = await this.getSubscription(userId);
    sub.planTier = planTier;
    sub.currentPeriodEnd = new Date(Date.now() + 30 * 86400000).toISOString();

    // Add bonus monthly credits based on plan
    const creditBonus = planTier === 'executive' ? 1500 : planTier === 'pro' ? 500 : 50;
    await this.addCredits(
      userId,
      creditBonus,
      'purchase',
      `${planTier.toUpperCase()} Plan Subscription Bonus (${creditBonus} credits)`
    );

    this.save();
    return sub;
  }

  // --- Resumes & Documents ---
  public async getResumes(userId: string): Promise<Resume[]> {
    return this.state.resumes.filter((r) => r.userId === userId);
  }

  public async addResume(resume: Resume): Promise<Resume> {
    if (resume.isPrimary) {
      this.state.resumes.forEach((r) => {
        if (r.userId === resume.userId) r.isPrimary = false;
      });
    }
    this.state.resumes.unshift(resume);
    this.save();
    return resume;
  }

  public async setPrimaryResume(resumeId: string, userId: string): Promise<boolean> {
    let found = false;
    this.state.resumes.forEach((r) => {
      if (r.userId === userId) {
        if (r.id === resumeId) {
          r.isPrimary = true;
          found = true;
        } else {
          r.isPrimary = false;
        }
      }
    });
    if (found) this.save();
    return found;
  }

  public async deleteResume(resumeId: string, userId: string): Promise<boolean> {
    const initialLen = this.state.resumes.length;
    this.state.resumes = this.state.resumes.filter(
      (r) => !(r.id === resumeId && r.userId === userId)
    );
    if (this.state.resumes.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  public async getDocuments(userId: string): Promise<KnowledgeDocument[]> {
    return this.state.documents.filter((d) => d.userId === userId);
  }

  public async addDocument(doc: KnowledgeDocument): Promise<KnowledgeDocument> {
    this.state.documents.unshift(doc);
    this.save();
    return doc;
  }

  public async deleteDocument(documentId: string, userId: string): Promise<boolean> {
    const initialLen = this.state.documents.length;
    this.state.documents = this.state.documents.filter(
      (d) => !(d.id === documentId && d.userId === userId)
    );
    if (this.state.documents.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Sessions & Transcripts ---
  public async getSessions(userId: string): Promise<InterviewSession[]> {
    return this.state.sessions.filter((s) => s.userId === userId);
  }

  public async getSession(sessionId: string): Promise<InterviewSession | undefined> {
    return this.state.sessions.find((s) => s.id === sessionId);
  }

  public async createSession(session: InterviewSession): Promise<InterviewSession> {
    this.state.sessions.unshift(session);
    this.state.transcripts[session.id] = [];
    this.state.answers[session.id] = [];
    this.save();
    return session;
  }

  public async updateSessionStatus(
    sessionId: string,
    status: InterviewSession['status'],
    durationDelta = 0,
    patch?: Partial<InterviewSession>
  ): Promise<InterviewSession | undefined> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.status = status;
      session.totalDurationSeconds += durationDelta;
      if (status === 'completed') {
        session.endedAt = new Date().toISOString();
      }
      if (patch) Object.assign(session, patch);
      this.save();
    }
    return session;
  }

  public async addTranscriptLine(sessionId: string, line: TranscriptLine): Promise<TranscriptLine> {
    if (!this.state.transcripts[sessionId]) {
      this.state.transcripts[sessionId] = [];
    }
    this.state.transcripts[sessionId].push(line);
    const session = await this.getSession(sessionId);
    if (session && line.isQuestion) {
      session.questionsCount += 1;
    }
    this.save();
    return line;
  }

  public async getTranscripts(sessionId: string): Promise<TranscriptLine[]> {
    return this.state.transcripts[sessionId] || [];
  }

  public async addAnswer(sessionId: string, answer: SessionAnswer): Promise<SessionAnswer> {
    if (!this.state.answers[sessionId]) {
      this.state.answers[sessionId] = [];
    }
    this.state.answers[sessionId].unshift(answer);
    this.save();
    return answer;
  }

  public async getAnswers(sessionId: string): Promise<SessionAnswer[]> {
    return this.state.answers[sessionId] || [];
  }

  public async getSessionNotes(sessionId: string): Promise<SessionNotes | undefined> {
    return this.state.notes[sessionId];
  }

  public async saveSessionNotes(notes: SessionNotes): Promise<SessionNotes> {
    this.state.notes[notes.sessionId] = notes;
    this.save();
    return notes;
  }

  // --- Admin ---
  public async getAuditLogs(): Promise<AuditLog[]> {
    return this.state.auditLogs;
  }

  public async addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    const entry: AuditLog = {
      id: 'aud_' + Math.random().toString(36).substring(2, 9),
      ...log,
      timestamp: new Date().toISOString(),
    };
    this.state.auditLogs.unshift(entry);
    this.save();
    return entry;
  }

  public async getAdminSettings(): Promise<AdminSettings> {
    if (!this.state.adminSettings) {
      this.state.adminSettings = { ...DEFAULT_ADMIN_SETTINGS };
      this.save();
    }
    return this.state.adminSettings;
  }

  public async updateAdminSettings(settings: Partial<AdminSettings>): Promise<AdminSettings> {
    const current = await this.getAdminSettings();
    this.state.adminSettings = {
      ...current,
      ...settings,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.state.adminSettings;
  }

  // Clear all data for a user (GDPR / right to be forgotten)
  public async clearUserData(uid: string): Promise<void> {
    // Remove user
    this.state.users = this.state.users.filter((u) => u.uid !== uid);

    // Remove devices
    this.state.devices = this.state.devices.filter((d) => d.userId !== uid);

    // Remove wallet
    delete this.state.wallets[uid];

    // Remove subscription
    delete this.state.subscriptions[uid];

    // Remove resumes
    this.state.resumes = this.state.resumes.filter((r) => r.userId !== uid);

    // Remove documents
    this.state.documents = this.state.documents.filter((d) => d.userId !== uid);

    // Remove sessions and all related data
    const sessionIds = this.state.sessions
      .filter((s) => s.userId === uid)
      .map((s) => s.id);
    this.state.sessions = this.state.sessions.filter((s) => s.userId !== uid);

    // Remove transcripts for user's sessions
    for (const sessionId of sessionIds) {
      delete this.state.transcripts[sessionId];
    }

    // Remove answers for user's sessions
    for (const sessionId of sessionIds) {
      delete this.state.answers[sessionId];
    }

    // Remove notes for user's sessions
    for (const sessionId of sessionIds) {
      delete this.state.notes[sessionId];
    }

    // Remove credit transactions
    this.state.transactions = this.state.transactions.filter((t) => t.userId !== uid);

    this.save();
  }
}

export const fileStore = new Database();
