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
} from '../types';
import { createDemoSeed, roleForEmail, DemoSeed } from './demoSeed';
import { DataStore, CreditChangeResult, DeviceRegistrationResult, NewUserAccount } from './dataStore';
import { FirestoreRest } from './firestoreRest';
import { PRIMARY_MODEL } from './gemini';

/**
 * DataStore on Cloud Firestore through the REST API (src/server/firestoreRest.ts).
 *
 * A method-for-method port of FirestoreStore (firebase-admin), used where
 * firebase-admin cannot run (Cloudflare Workers). Same collections, document
 * ids and semantics, so both runtimes share one database:
 *  - wallet changes and their ledger entry commit in one transaction;
 *  - single-field equality queries, sorted in memory (no composite indexes);
 *  - device ids are `<uid>_<deviceType>` (1 desktop + 1 mobile).
 */
const C = {
  users: 'users',
  devices: 'user_devices',
  wallets: 'credit_wallets',
  transactions: 'credit_transactions',
  subscriptions: 'subscriptions',
  resumes: 'resumes',
  documents: 'documents',
  sessions: 'sessions',
  transcripts: 'session_transcripts',
  answers: 'session_answers',
  notes: 'session_notes',
  auditLogs: 'audit_logs',
  adminSettings: 'admin_settings',
} as const;

const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  activeAiProvider: 'google_gemini',
  defaultModel: PRIMARY_MODEL,
  costPerCreditUsd: 0.1,
  creditsPerMinute: 1,
  maintenanceMode: false,
  maxSessionsPerUser: 10,
  enrolledEmails: [],
  updatedAt: new Date().toISOString(),
};

const WELCOME_CREDITS = 100;
/** Upper bound for admin-wide collection reads (Spark plan: 50k reads/day). */
const ADMIN_SCAN_LIMIT = 500;

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function sortByCreatedAtDesc<T extends { createdAt?: string }>(items: T[]): T[] {
  return items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export interface FirestoreRestStoreOptions {
  /**
   * Emails allowed to claim the bootstrap super_admin role (lower-case).
   * Empty = legacy behaviour: the very first account becomes super_admin,
   * which on a public sign-up page means whoever signs in first.
   */
  bootstrapAdminEmails?: string[];
}

export class FirestoreRestStore implements DataStore {
  readonly kind = 'firestore' as const;
  private readonly bootstrapAdmins: Set<string>;

  constructor(private readonly fs: FirestoreRest, opts: FirestoreRestStoreOptions = {}) {
    this.bootstrapAdmins = new Set((opts.bootstrapAdminEmails || []).map((e) => e.trim().toLowerCase()).filter(Boolean));
  }

  /** Whether this new account becomes super_admin. */
  private async claimsBootstrapAdmin(account: NewUserAccount): Promise<boolean> {
    if (this.bootstrapAdmins.size > 0) {
      // Allow-listed owners only, and only with a verified email (Google sign-in).
      return Boolean(account.emailVerified) && this.bootstrapAdmins.has((account.email || '').toLowerCase());
    }
    const admins = await this.fs.query(C.users, [{ field: 'role', op: 'IN', value: ['super_admin', 'admin'] }], 1);
    return admins.length === 0;
  }

  private async byField<T>(collection: string, field: string, value: string): Promise<T[]> {
    const rows = await this.fs.query<T>(collection, [{ field, op: 'EQUAL', value }]);
    return rows.map((r) => r.data);
  }

  // --- Users & Devices ---
  public async ensureUser(account: NewUserAccount): Promise<User> {
    const existing = await this.fs.get<User>(C.users, account.uid);
    if (existing) {
      const next: User = {
        ...existing,
        email: account.email || existing.email,
        displayName: account.displayName || existing.displayName,
        photoURL: account.photoURL ?? existing.photoURL,
        emailVerified: account.emailVerified ?? existing.emailVerified,
        // Never let a role downgrade happen through sign-in metadata.
        role: existing.role || roleForEmail(account.email),
      };
      const changed =
        next.email !== existing.email ||
        next.displayName !== existing.displayName ||
        next.photoURL !== existing.photoURL ||
        next.emailVerified !== existing.emailVerified;
      // Skip the write on every request when nothing changed (Spark write quota).
      if (changed) {
        next.updatedAt = new Date().toISOString();
        await this.fs.set(C.users, account.uid, next, { merge: true });
      }
      return next;
    }

    const seed = createDemoSeed(account.uid, account.email, account.displayName, {});
    const user: User = {
      ...seed.user,
      photoURL: account.photoURL,
      emailVerified: account.emailVerified ?? false,
      role: (await this.claimsBootstrapAdmin(account)) ? 'super_admin' : roleForEmail(account.email),
    };
    await this.fs.commit(this.seedWrites(account.uid, user, seed));
    return user;
  }

  private seedWrites(uid: string, user: User, seed: DemoSeed) {
    const w = (collection: string, id: string, data: object) => this.fs.setWrite(collection, id, data);
    return [
      w(C.users, uid, user),
      w(C.wallets, uid, seed.wallet),
      w(C.subscriptions, uid, seed.subscription),
      ...seed.resumes.map((r) => w(C.resumes, r.id, r)),
      ...seed.documents.map((d) => w(C.documents, d.id, d)),
      ...seed.sessions.map((s) => w(C.sessions, s.id, s)),
      ...seed.transactions.map((t) => w(C.transactions, t.id, t)),
      ...Object.values(seed.transcripts).flatMap((lines) => lines.map((l) => w(C.transcripts, l.id, l))),
      ...Object.values(seed.answers).flatMap((answers) => answers.map((a) => w(C.answers, a.id, a))),
      ...Object.entries(seed.notes).map(([sessionId, note]) => w(C.notes, sessionId, note)),
      ...seed.auditLogs.map((log) => w(C.auditLogs, log.id, log)),
    ];
  }

  public getUser(uid: string): Promise<User | undefined> {
    return this.fs.get<User>(C.users, uid);
  }

  public async getDevices(userId: string): Promise<UserDevice[]> {
    const devices = await this.byField<UserDevice>(C.devices, 'userId', userId);
    return devices.sort((a, b) => (b.lastActiveAt || '').localeCompare(a.lastActiveAt || ''));
  }

  public async registerDevice(
    userId: string,
    deviceType: 'desktop' | 'mobile',
    deviceName: string,
    userAgent: string,
    ipAddress: string
  ): Promise<DeviceRegistrationResult> {
    const docId = `${userId}_${deviceType}`;
    const revokedOldDevice = await this.fs.get<UserDevice>(C.devices, docId);
    const device: UserDevice = {
      id: docId,
      userId,
      deviceType,
      deviceName,
      userAgent,
      ipAddress,
      lastActiveAt: new Date().toISOString(),
      sessionToken: 'tok_' + crypto.randomUUID().replace(/-/g, '').slice(0, 10),
      isCurrent: true,
    };

    // Drop legacy, randomly identified devices of the same type.
    const legacy = await this.fs.query(C.devices, [
      { field: 'userId', op: 'EQUAL', value: userId },
      { field: 'deviceType', op: 'EQUAL', value: deviceType },
    ]);
    await this.fs.commit([
      this.fs.setWrite(C.devices, docId, device),
      ...legacy.filter((d) => d.id !== docId).map((d) => this.fs.deleteWrite(C.devices, d.id)),
    ]);
    return { device, revokedOldDevice };
  }

  public async revokeDevice(deviceId: string, userId: string): Promise<boolean> {
    const device = await this.fs.get<UserDevice>(C.devices, deviceId);
    if (!device || device.userId !== userId) return false;
    await this.fs.delete(C.devices, deviceId);
    return true;
  }

  // --- Wallet & Credits ---
  private welcomeWallet(userId: string): CreditWallet {
    return {
      userId,
      balanceCredits: WELCOME_CREDITS,
      lifetimePurchased: WELCOME_CREDITS,
      lifetimeSpent: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  public async getWallet(userId: string): Promise<CreditWallet> {
    const wallet = await this.fs.get<CreditWallet>(C.wallets, userId);
    if (wallet) return wallet;
    const fresh = this.welcomeWallet(userId);
    await this.fs.set(C.wallets, userId, fresh);
    return fresh;
  }

  public deductCredits(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string
  ): Promise<CreditChangeResult> {
    return this.fs.runTransaction<CreditChangeResult>(async (tx) => {
      const wallet = (await tx.get<CreditWallet>(C.wallets, userId)) || this.welcomeWallet(userId);
      if (wallet.balanceCredits < amount) {
        return {
          writes: [],
          result: {
            success: false,
            balanceAfter: wallet.balanceCredits,
            error: 'Insufficient credits. Please top up your wallet.',
          },
        };
      }
      const now = new Date().toISOString();
      const next: CreditWallet = {
        ...wallet,
        balanceCredits: wallet.balanceCredits - amount,
        lifetimeSpent: wallet.lifetimeSpent + amount,
        updatedAt: now,
      };
      const ledger: CreditTransaction = {
        id: newId('tx'),
        userId,
        amount: -amount,
        type: 'session_deduction',
        balanceAfter: next.balanceCredits,
        description,
        referenceId,
        createdAt: now,
      };
      return {
        writes: [this.fs.setWrite(C.wallets, userId, next), this.fs.setWrite(C.transactions, ledger.id, ledger)],
        result: { success: true, balanceAfter: next.balanceCredits },
      };
    });
  }

  public addCredits(
    userId: string,
    amount: number,
    type: 'purchase' | 'admin_grant' | 'refund' | 'session_deduction',
    description: string
  ): Promise<CreditWallet> {
    return this.fs.runTransaction(async (tx) => {
      const current = (await tx.get<CreditWallet>(C.wallets, userId)) || this.welcomeWallet(userId);
      const now = new Date().toISOString();
      const next: CreditWallet = {
        ...current,
        balanceCredits: current.balanceCredits + amount,
        lifetimePurchased: type === 'purchase' ? current.lifetimePurchased + amount : current.lifetimePurchased,
        updatedAt: now,
      };
      const ledger: CreditTransaction = {
        id: newId('tx'),
        userId,
        amount,
        type,
        balanceAfter: next.balanceCredits,
        description,
        createdAt: now,
      };
      return {
        writes: [this.fs.setWrite(C.wallets, userId, next), this.fs.setWrite(C.transactions, ledger.id, ledger)],
        result: next,
      };
    });
  }

  public async getTransactions(userId: string): Promise<CreditTransaction[]> {
    return sortByCreatedAtDesc(await this.byField<CreditTransaction>(C.transactions, 'userId', userId));
  }

  // --- Subscriptions ---
  public async getSubscription(userId: string): Promise<Subscription> {
    const existing = await this.fs.get<Subscription>(C.subscriptions, userId);
    if (existing) return existing;
    const subscription: Subscription = {
      id: newId('sub'),
      userId,
      planTier: 'starter',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      cancelAtPeriodEnd: false,
    };
    await this.fs.set(C.subscriptions, userId, subscription);
    return subscription;
  }

  public async updateSubscription(userId: string, planTier: Subscription['planTier']): Promise<Subscription> {
    const subscription = await this.getSubscription(userId);
    const next: Subscription = {
      ...subscription,
      planTier,
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    };
    await this.fs.set(C.subscriptions, userId, next);
    const bonus = planTier === 'executive' ? 1500 : planTier === 'pro' ? 500 : 50;
    await this.addCredits(userId, bonus, 'purchase', `${planTier.toUpperCase()} Plan Subscription Bonus (${bonus} credits)`);
    return next;
  }

  // --- Resumes & Documents ---
  public async getResumes(userId: string): Promise<Resume[]> {
    return sortByCreatedAtDesc(await this.byField<Resume>(C.resumes, 'userId', userId));
  }

  public async addResume(resume: Resume): Promise<Resume> {
    const writes = [];
    if (resume.isPrimary) {
      const others = await this.getResumes(resume.userId);
      for (const r of others) {
        if (r.id !== resume.id && r.isPrimary) {
          writes.push(this.fs.setWrite(C.resumes, r.id, { isPrimary: false }, { merge: true }));
        }
      }
    }
    writes.push(this.fs.setWrite(C.resumes, resume.id, resume));
    await this.fs.commit(writes);
    return resume;
  }

  public async setPrimaryResume(resumeId: string, userId: string): Promise<boolean> {
    const owned = await this.getResumes(userId);
    if (!owned.some((r) => r.id === resumeId)) return false;
    await this.fs.commit(
      owned.map((r) => this.fs.setWrite(C.resumes, r.id, { isPrimary: r.id === resumeId }, { merge: true }))
    );
    return true;
  }

  public async deleteResume(resumeId: string, userId: string): Promise<boolean> {
    const resume = await this.fs.get<Resume>(C.resumes, resumeId);
    if (!resume || resume.userId !== userId) return false;
    await this.fs.delete(C.resumes, resumeId);
    return true;
  }

  public async getDocuments(userId: string): Promise<KnowledgeDocument[]> {
    return sortByCreatedAtDesc(await this.byField<KnowledgeDocument>(C.documents, 'userId', userId));
  }

  public async addDocument(doc: KnowledgeDocument): Promise<KnowledgeDocument> {
    await this.fs.set(C.documents, doc.id, doc);
    return doc;
  }

  public async deleteDocument(documentId: string, userId: string): Promise<boolean> {
    const doc = await this.fs.get<KnowledgeDocument>(C.documents, documentId);
    if (!doc || doc.userId !== userId) return false;
    await this.fs.delete(C.documents, documentId);
    return true;
  }

  // --- Sessions & Transcripts ---
  public async getSessions(userId: string): Promise<InterviewSession[]> {
    const items = await this.byField<InterviewSession>(C.sessions, 'userId', userId);
    return sortByCreatedAtDesc(items.map((s) => ({ ...s, createdAt: s.startedAt })));
  }

  public getSession(sessionId: string): Promise<InterviewSession | undefined> {
    return this.fs.get<InterviewSession>(C.sessions, sessionId);
  }

  public async createSession(session: InterviewSession): Promise<InterviewSession> {
    await this.fs.set(C.sessions, session.id, session);
    return session;
  }

  public async updateSessionStatus(
    sessionId: string,
    status: InterviewSession['status'],
    durationDelta = 0,
    patch?: Partial<InterviewSession>
  ): Promise<InterviewSession | undefined> {
    const session = await this.getSession(sessionId);
    if (!session) return undefined;
    const next: InterviewSession = {
      ...session,
      ...(patch || {}),
      status,
      totalDurationSeconds: (session.totalDurationSeconds || 0) + durationDelta,
      endedAt: status === 'completed' ? new Date().toISOString() : session.endedAt,
    };
    await this.fs.set(C.sessions, sessionId, next, { merge: true });
    return next;
  }

  public async addTranscriptLine(sessionId: string, line: TranscriptLine): Promise<TranscriptLine> {
    const writes = [this.fs.setWrite(C.transcripts, line.id, { ...line, createdAtMs: Date.now() })];
    if (line.isQuestion) {
      const session = await this.getSession(sessionId);
      if (session) {
        writes.push(
          this.fs.setWrite(C.sessions, sessionId, { questionsCount: (session.questionsCount || 0) + 1 }, { merge: true })
        );
      }
    }
    await this.fs.commit(writes);
    return line;
  }

  public async getTranscripts(sessionId: string): Promise<TranscriptLine[]> {
    const items = await this.byField<TranscriptLine & { createdAtMs?: number }>(C.transcripts, 'sessionId', sessionId);
    return items
      .sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0))
      .map(({ createdAtMs, ...line }) => line as TranscriptLine);
  }

  public async addAnswer(_sessionId: string, answer: SessionAnswer): Promise<SessionAnswer> {
    await this.fs.set(C.answers, answer.id, answer);
    return answer;
  }

  public async getAnswers(sessionId: string): Promise<SessionAnswer[]> {
    return sortByCreatedAtDesc(await this.byField<SessionAnswer>(C.answers, 'sessionId', sessionId));
  }

  /** Session notes are 1:1 with a session, so the session id is the doc id. */
  public getSessionNotes(sessionId: string): Promise<SessionNotes | undefined> {
    return this.fs.get<SessionNotes>(C.notes, sessionId);
  }

  public async saveSessionNotes(notes: SessionNotes): Promise<SessionNotes> {
    await this.fs.set(C.notes, notes.sessionId, notes);
    return notes;
  }

  // --- Admin ---
  public async getState() {
    const [users, wallets, subs, sessions] = await Promise.all([
      this.fs.query<User>(C.users, [], ADMIN_SCAN_LIMIT),
      this.fs.query<CreditWallet>(C.wallets, [], ADMIN_SCAN_LIMIT),
      this.fs.query<Subscription>(C.subscriptions, [], ADMIN_SCAN_LIMIT),
      this.fs.query<InterviewSession>(C.sessions, [], ADMIN_SCAN_LIMIT),
    ]);
    const walletMap: Record<string, CreditWallet> = {};
    wallets.forEach((w) => (walletMap[w.data.userId || w.id] = w.data));
    const subMap: Record<string, Subscription> = {};
    subs.forEach((s) => (subMap[s.data.userId || s.id] = s.data));
    return {
      users: users.map((u) => u.data),
      wallets: walletMap,
      subscriptions: subMap,
      sessions: sessions.map((s) => s.data),
      adminSettings: await this.getAdminSettings(),
    };
  }

  public async getAuditLogs(): Promise<AuditLog[]> {
    const rows = await this.fs.query<AuditLog>(C.auditLogs, [], 200);
    return rows.map((r) => r.data).sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  }

  public async addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    const entry: AuditLog = { id: newId('aud'), ...log, timestamp: new Date().toISOString() };
    await this.fs.set(C.auditLogs, entry.id, entry);
    return entry;
  }

  public async getAdminSettings(): Promise<AdminSettings> {
    const settings = await this.fs.get<AdminSettings>(C.adminSettings, 'global');
    if (settings) return settings;
    await this.fs.set(C.adminSettings, 'global', DEFAULT_ADMIN_SETTINGS);
    return DEFAULT_ADMIN_SETTINGS;
  }

  public async updateAdminSettings(settings: Partial<AdminSettings>): Promise<AdminSettings> {
    const next: AdminSettings = { ...(await this.getAdminSettings()), ...settings, updatedAt: new Date().toISOString() };
    await this.fs.set(C.adminSettings, 'global', next);
    return next;
  }

  // Clear all data for a user (GDPR / right to be forgotten)
  public async clearUserData(uid: string): Promise<void> {
    const deletes = [
      this.fs.deleteWrite(C.users, uid),
      this.fs.deleteWrite(C.wallets, uid),
      this.fs.deleteWrite(C.subscriptions, uid),
    ];
    const owned = (collection: string) => this.fs.query(collection, [{ field: 'userId', op: 'EQUAL', value: uid }]);
    const [devices, sessions, transactions, resumes, documents] = await Promise.all([
      owned(C.devices),
      owned(C.sessions),
      owned(C.transactions),
      owned(C.resumes),
      owned(C.documents),
    ]);
    for (const [collection, rows] of [
      [C.devices, devices],
      [C.transactions, transactions],
      [C.resumes, resumes],
      [C.documents, documents],
    ] as const) {
      rows.forEach((d) => deletes.push(this.fs.deleteWrite(collection, d.id)));
    }
    for (const s of sessions) {
      deletes.push(this.fs.deleteWrite(C.sessions, s.id));
      const [lines, answers, notes] = await Promise.all([
        this.fs.query(C.transcripts, [{ field: 'sessionId', op: 'EQUAL', value: s.id }]),
        this.fs.query(C.answers, [{ field: 'sessionId', op: 'EQUAL', value: s.id }]),
        this.fs.query(C.notes, [{ field: 'sessionId', op: 'EQUAL', value: s.id }]),
      ]);
      lines.forEach((d) => deletes.push(this.fs.deleteWrite(C.transcripts, d.id)));
      answers.forEach((d) => deletes.push(this.fs.deleteWrite(C.answers, d.id)));
      notes.forEach((d) => deletes.push(this.fs.deleteWrite(C.notes, d.id)));
    }
    await this.fs.commit(deletes);
  }
}
