import type { Firestore, DocumentData, CollectionReference } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
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
import { createDemoSeed, roleForEmail } from './demoSeed';
import {
  DataStore,
  CreditChangeResult,
  DeviceRegistrationResult,
  NewUserAccount,
  EnrollmentError,
} from './dataStore';
import { FirebaseAdminContext } from './firebaseAdmin';
import { PRIMARY_MODEL } from './gemini';

const COLLECTIONS = {
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
  // Invitation-only platform: enrolledEmails starts empty.
  // The first signer-up becomes super_admin via ensureUser bootstrap logic.
  enrolledEmails: [],
  updatedAt: new Date().toISOString(),
};

const WELCOME_CREDITS = 100;

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 11)}`;
}

function sortByCreatedAtDesc<T extends { createdAt?: string }>(items: T[]): T[] {
  return items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

/**
 * DataStore backed by Cloud Firestore through firebase-admin.
 *
 * Notes on design:
 *  - Wallet mutations run inside transactions together with the immutable
 *    credit ledger, so a balance can never change without a matching entry.
 *  - Query results are sorted in memory instead of with `orderBy`, which keeps
 *    the project free of composite index setup for the single-field filters.
 *  - Device docs use the deterministic id `<uid>_<deviceType>` so the
 *    "1 active desktop + 1 active mobile" rule is enforced by the schema.
 */
export class FirestoreStore implements DataStore {
  readonly kind = 'firestore' as const;
  private readonly db: Firestore;
  private readonly auth: Auth;

  constructor(ctx: FirebaseAdminContext) {
    this.db = ctx.firestore;
    this.auth = ctx.auth;
  }

  private col(name: string): CollectionReference<DocumentData> {
    return this.db.collection(name);
  }

  private async queryBy<T>(
    name: string,
    field: string,
    value: string
  ): Promise<T[]> {
    const snap = await this.col(name).where(field, '==', value).get();
    return snap.docs.map((d) => d.data() as T);
  }

  // --- Users & Devices ---
  public async ensureUser(account: NewUserAccount): Promise<User> {
    const ref = this.col(COLLECTIONS.users).doc(account.uid);
    const snap = await ref.get();

    if (snap.exists) {
      const data = snap.data() as User;
      const next: User = {
        ...data,
        email: account.email || data.email,
        displayName: account.displayName || data.displayName,
        photoURL: account.photoURL ?? data.photoURL,
        emailVerified: account.emailVerified ?? data.emailVerified,
        // Never let a role downgrade happen through sign-in metadata.
        role: data.role || roleForEmail(account.email),
        updatedAt: new Date().toISOString(),
      };
      await ref.set(next, { merge: true });
      return next;
    }

    const seed = createDemoSeed(account.uid, account.email, account.displayName, {});
    // Invitation-only: a brand-new account must be on the enrolled list.
    const settings = await this.getAdminSettings();
    const enrolled = (settings.enrolledEmails || []).map((e) => e.toLowerCase());
    if (!enrolled.includes(account.email.toLowerCase())) {
      throw new EnrollmentError(account.email);
    }
    // Bootstrap: if no admin/super_admin exists yet, the first signer-up becomes super_admin.
    const adminSnap = await this.col(COLLECTIONS.users)
      .where('role', 'in', ['super_admin', 'admin'])
      .limit(1)
      .get();
    const user: User = {
      ...seed.user,
      photoURL: account.photoURL,
      emailVerified: account.emailVerified ?? false,
      role: adminSnap.empty ? 'super_admin' : roleForEmail(account.email),
    };

    const batch = this.db.batch();
    batch.set(ref, user);
    batch.set(this.col(COLLECTIONS.wallets).doc(account.uid), seed.wallet);
    batch.set(this.col(COLLECTIONS.subscriptions).doc(account.uid), seed.subscription);

    seed.resumes.forEach((r) => batch.set(this.col(COLLECTIONS.resumes).doc(r.id), r));
    seed.documents.forEach((d) => batch.set(this.col(COLLECTIONS.documents).doc(d.id), d));
    seed.sessions.forEach((s) => batch.set(this.col(COLLECTIONS.sessions).doc(s.id), s));
    seed.transactions.forEach((t) =>
      batch.set(this.col(COLLECTIONS.transactions).doc(t.id), t)
    );
    Object.entries(seed.transcripts).forEach(([sessionId, lines]) =>
      lines.forEach((line) => batch.set(this.col(COLLECTIONS.transcripts).doc(line.id), line))
    );
    Object.entries(seed.answers).forEach(([sessionId, answers]) =>
      answers.forEach((answer) => batch.set(this.col(COLLECTIONS.answers).doc(answer.id), answer))
    );
    Object.entries(seed.notes).forEach(([sessionId, note]) =>
      batch.set(this.col(COLLECTIONS.notes).doc(sessionId), note)
    );
    seed.auditLogs.forEach((log) =>
      batch.set(this.col(COLLECTIONS.auditLogs).doc(log.id), log)
    );
    await batch.commit();

    return user;
  }

  public async getUser(uid: string): Promise<User | undefined> {
    const snap = await this.col(COLLECTIONS.users).doc(uid).get();
    return snap.exists ? (snap.data() as User) : undefined;
  }

  public async getDevices(userId: string): Promise<UserDevice[]> {
    const devices = await this.queryBy<UserDevice>(COLLECTIONS.devices, 'userId', userId);
    return devices.sort((a, b) => (b.lastActiveAt || '').localeCompare(a.lastActiveAt || ''));
  }

  public async registerDevice(
    userId: string,
    deviceType: 'desktop' | 'mobile',
    deviceName: string,
    userAgent: string,
    ipAddress: string
  ): Promise<DeviceRegistrationResult> {
    // Deterministic id => at most one active desktop and one active mobile.
    const docId = `${userId}_${deviceType}`;
    const ref = this.col(COLLECTIONS.devices).doc(docId);
    const existing = await ref.get();
    const revokedOldDevice = existing.exists ? (existing.data() as UserDevice) : undefined;

    const newDevice: UserDevice = {
      id: docId,
      userId,
      deviceType,
      deviceName,
      userAgent,
      ipAddress,
      lastActiveAt: new Date().toISOString(),
      sessionToken: 'tok_' + Math.random().toString(36).substring(2, 12),
      isCurrent: true,
    };

    const batch = this.db.batch();
    batch.set(ref, newDevice);
    // Drop any legacy/randomly identified devices of the same type.
    const legacy = await this.col(COLLECTIONS.devices)
      .where('userId', '==', userId)
      .where('deviceType', '==', deviceType)
      .get();
    legacy.docs.forEach((d) => {
      if (d.id !== docId) batch.delete(d.ref);
    });
    await batch.commit();

    return { device: newDevice, revokedOldDevice };
  }

  public async revokeDevice(deviceId: string, userId: string): Promise<boolean> {
    const ref = this.col(COLLECTIONS.devices).doc(deviceId);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.userId !== userId) return false;
    await ref.delete();
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
    const ref = this.col(COLLECTIONS.wallets).doc(userId);
    const snap = await ref.get();
    if (snap.exists) return snap.data() as CreditWallet;
    const wallet = this.welcomeWallet(userId);
    await ref.set(wallet);
    return wallet;
  }

  public async deductCredits(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string
  ): Promise<CreditChangeResult> {
    const walletRef = this.col(COLLECTIONS.wallets).doc(userId);
    let result: CreditChangeResult = { success: false, balanceAfter: 0 };

    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(walletRef);
      const wallet = (snap.exists ? snap.data() : this.welcomeWallet(userId)) as CreditWallet;

      if (wallet.balanceCredits < amount) {
        result = {
          success: false,
          balanceAfter: wallet.balanceCredits,
          error: 'Insufficient credits. Please top up your wallet.',
        };
        return;
      }

      const now = new Date().toISOString();
      const nextWallet: CreditWallet = {
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
        balanceAfter: nextWallet.balanceCredits,
        description,
        referenceId,
        createdAt: now,
      };

      tx.set(walletRef, nextWallet);
      tx.set(this.col(COLLECTIONS.transactions).doc(ledger.id), ledger);
      result = { success: true, balanceAfter: nextWallet.balanceCredits };
    });

    return result;
  }

  public async addCredits(
    userId: string,
    amount: number,
    type: 'purchase' | 'admin_grant' | 'refund' | 'session_deduction',
    description: string
  ): Promise<CreditWallet> {
    const walletRef = this.col(COLLECTIONS.wallets).doc(userId);
    let wallet = this.welcomeWallet(userId);

    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(walletRef);
      const current = (snap.exists ? snap.data() : this.welcomeWallet(userId)) as CreditWallet;
      const now = new Date().toISOString();
      const nextWallet: CreditWallet = {
        ...current,
        balanceCredits: current.balanceCredits + amount,
        lifetimePurchased:
          type === 'purchase' ? current.lifetimePurchased + amount : current.lifetimePurchased,
        updatedAt: now,
      };
      const ledger: CreditTransaction = {
        id: newId('tx'),
        userId,
        amount,
        type,
        balanceAfter: nextWallet.balanceCredits,
        description,
        createdAt: now,
      };
      tx.set(walletRef, nextWallet);
      tx.set(this.col(COLLECTIONS.transactions).doc(ledger.id), ledger);
      wallet = nextWallet;
    });

    return wallet;
  }

  public async getTransactions(userId: string): Promise<CreditTransaction[]> {
    const items = await this.queryBy<CreditTransaction>(
      COLLECTIONS.transactions,
      'userId',
      userId
    );
    return sortByCreatedAtDesc(items);
  }

  // --- Subscriptions ---
  public async getSubscription(userId: string): Promise<Subscription> {
    const ref = this.col(COLLECTIONS.subscriptions).doc(userId);
    const snap = await ref.get();
    if (snap.exists) return snap.data() as Subscription;
    const subscription: Subscription = {
      id: newId('sub'),
      userId,
      planTier: 'starter',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      cancelAtPeriodEnd: false,
    };
    await ref.set(subscription);
    return subscription;
  }

  public async updateSubscription(userId: string, planTier: Subscription['planTier']): Promise<Subscription> {
    const subscription = await this.getSubscription(userId);
    const next: Subscription = {
      ...subscription,
      planTier,
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    };
    await this.col(COLLECTIONS.subscriptions).doc(userId).set(next);

    const creditBonus = planTier === 'executive' ? 1500 : planTier === 'pro' ? 500 : 50;
    await this.addCredits(
      userId,
      creditBonus,
      'purchase',
      `${planTier.toUpperCase()} Plan Subscription Bonus (${creditBonus} credits)`
    );
    return next;
  }

  // --- Resumes & Documents ---
  public async getResumes(userId: string): Promise<Resume[]> {
    const items = await this.queryBy<Resume>(COLLECTIONS.resumes, 'userId', userId);
    return sortByCreatedAtDesc(items);
  }

  public async addResume(resume: Resume): Promise<Resume> {
    if (resume.isPrimary) {
      const others = await this.getResumes(resume.userId);
      const batch = this.db.batch();
      others.forEach((r) => {
        if (r.id !== resume.id && r.isPrimary) {
          batch.set(
            this.col(COLLECTIONS.resumes).doc(r.id),
            { isPrimary: false },
            { merge: true }
          );
        }
      });
      await batch.commit();
    }
    await this.col(COLLECTIONS.resumes).doc(resume.id).set(resume);
    return resume;
  }

  public async setPrimaryResume(resumeId: string, userId: string): Promise<boolean> {
    const owned = await this.getResumes(userId);
    const target = owned.find((r) => r.id === resumeId);
    if (!target) return false;

    const batch = this.db.batch();
    owned.forEach((r) => {
      batch.set(
        this.col(COLLECTIONS.resumes).doc(r.id),
        { isPrimary: r.id === resumeId },
        { merge: true }
      );
    });
    await batch.commit();
    return true;
  }

  public async deleteResume(resumeId: string, userId: string): Promise<boolean> {
    const ref = this.col(COLLECTIONS.resumes).doc(resumeId);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.userId !== userId) return false;
    await ref.delete();
    return true;
  }

  public async getDocuments(userId: string): Promise<KnowledgeDocument[]> {
    const items = await this.queryBy<KnowledgeDocument>(COLLECTIONS.documents, 'userId', userId);
    return sortByCreatedAtDesc(items);
  }

  public async addDocument(doc: KnowledgeDocument): Promise<KnowledgeDocument> {
    await this.col(COLLECTIONS.documents).doc(doc.id).set(doc);
    return doc;
  }

  public async deleteDocument(documentId: string, userId: string): Promise<boolean> {
    const ref = this.col(COLLECTIONS.documents).doc(documentId);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.userId !== userId) return false;
    await ref.delete();
    return true;
  }

  // --- Sessions & Transcripts ---
  public async getSessions(userId: string): Promise<InterviewSession[]> {
    const items = await this.queryBy<InterviewSession>(COLLECTIONS.sessions, 'userId', userId);
    return sortByCreatedAtDesc(items.map((s) => ({ ...s, createdAt: s.startedAt })));
  }

  public async getSession(sessionId: string): Promise<InterviewSession | undefined> {
    const snap = await this.col(COLLECTIONS.sessions).doc(sessionId).get();
    return snap.exists ? (snap.data() as InterviewSession) : undefined;
  }

  public async createSession(session: InterviewSession): Promise<InterviewSession> {
    await this.col(COLLECTIONS.sessions).doc(session.id).set(session);
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
    await this.col(COLLECTIONS.sessions).doc(sessionId).set(next, { merge: true });
    return next;
  }

  public async addTranscriptLine(sessionId: string, line: TranscriptLine): Promise<TranscriptLine> {
    const batch = this.db.batch();
    // createdAtMs gives us an insertion-order sort key (locale timestamps are
    // not comparable), stored alongside the API-facing fields.
    batch.set(this.col(COLLECTIONS.transcripts).doc(line.id), {
      ...line,
      createdAtMs: Date.now(),
    });
    if (line.isQuestion) {
      const sessionRef = this.col(COLLECTIONS.sessions).doc(sessionId);
      const snap = await sessionRef.get();
      if (snap.exists) {
        const session = snap.data() as InterviewSession;
        batch.set(
          sessionRef,
          { questionsCount: (session.questionsCount || 0) + 1 },
          { merge: true }
        );
      }
    }
    await batch.commit();
    return line;
  }

  public async getTranscripts(sessionId: string): Promise<TranscriptLine[]> {
    const items = await this.queryBy<TranscriptLine & { createdAtMs?: number }>(
      COLLECTIONS.transcripts,
      'sessionId',
      sessionId
    );
    return items
      .sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0))
      .map(({ createdAtMs, ...line }) => line as TranscriptLine);
  }

  public async addAnswer(sessionId: string, answer: SessionAnswer): Promise<SessionAnswer> {
    await this.col(COLLECTIONS.answers).doc(answer.id).set(answer);
    return answer;
  }

  public async getAnswers(sessionId: string): Promise<SessionAnswer[]> {
    const items = await this.queryBy<SessionAnswer>(COLLECTIONS.answers, 'sessionId', sessionId);
    return sortByCreatedAtDesc(items);
  }

  /** Session notes are 1:1 with a session, so the session id is the doc id. */
  public async getSessionNotes(sessionId: string): Promise<SessionNotes | undefined> {
    const snap = await this.col(COLLECTIONS.notes).doc(sessionId).get();
    return snap.exists ? (snap.data() as SessionNotes) : undefined;
  }

  public async saveSessionNotes(notes: SessionNotes): Promise<SessionNotes> {
    await this.col(COLLECTIONS.notes).doc(notes.sessionId).set(notes);
    return notes;
  }

  // --- Admin ---
  public async getState(): Promise<{
    users: User[];
    wallets: Record<string, CreditWallet>;
    subscriptions: Record<string, Subscription>;
    sessions: InterviewSession[];
    adminSettings: AdminSettings;
  }> {
    const [usersSnap, walletsSnap, subsSnap, sessionsSnap] = await Promise.all([
      this.col(COLLECTIONS.users).get(),
      this.col(COLLECTIONS.wallets).get(),
      this.col(COLLECTIONS.subscriptions).get(),
      this.col(COLLECTIONS.sessions).get(),
    ]);

    const wallets: Record<string, CreditWallet> = {};
    walletsSnap.docs.forEach((d) => {
      const w = d.data() as CreditWallet;
      wallets[w.userId || d.id] = w;
    });
    const subscriptions: Record<string, Subscription> = {};
    subsSnap.docs.forEach((d) => {
      const s = d.data() as Subscription;
      subscriptions[s.userId || d.id] = s;
    });

    return {
      users: usersSnap.docs.map((d) => d.data() as User),
      wallets,
      subscriptions,
      sessions: sessionsSnap.docs.map((d) => d.data() as InterviewSession),
      adminSettings: await this.getAdminSettings(),
    };
  }

  public async getAuditLogs(): Promise<AuditLog[]> {
    const snap = await this.col(COLLECTIONS.auditLogs).limit(200).get();
    return snap.docs
      .map((d) => d.data() as AuditLog)
      .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  }

  public async addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    const entry: AuditLog = {
      id: newId('aud'),
      ...log,
      timestamp: new Date().toISOString(),
    };
    await this.col(COLLECTIONS.auditLogs).doc(entry.id).set(entry);
    return entry;
  }

  public async getAdminSettings(): Promise<AdminSettings> {
    const snap = await this.col(COLLECTIONS.adminSettings).doc('global').get();
    if (snap.exists) return snap.data() as AdminSettings;
    await this.col(COLLECTIONS.adminSettings).doc('global').set(DEFAULT_ADMIN_SETTINGS);
    return DEFAULT_ADMIN_SETTINGS;
  }

  public async updateAdminSettings(settings: Partial<AdminSettings>): Promise<AdminSettings> {
    const current = await this.getAdminSettings();
    const next: AdminSettings = {
      ...current,
      ...settings,
      updatedAt: new Date().toISOString(),
    };
    await this.col(COLLECTIONS.adminSettings).doc('global').set(next);
    return next;
  }

  // Clear all data for a user (GDPR / right to be forgotten)
  public async clearUserData(uid: string): Promise<void> {
    const batch = this.db.batch();
    const collectionsToClear: string[] = [
      COLLECTIONS.users,
      COLLECTIONS.devices,
      COLLECTIONS.wallets,
      COLLECTIONS.subscriptions,
      COLLECTIONS.resumes,
      COLLECTIONS.documents,
      COLLECTIONS.transactions,
      COLLECTIONS.auditLogs,
    ];

    // Delete user document
    batch.delete(this.col(COLLECTIONS.users).doc(uid));

    // Query and delete all documents owned by this user in other collections
    const queries: Promise<void>[] = [];

    // Devices: delete docs where userId == uid
    queries.push(
      this.col(COLLECTIONS.devices)
        .where('userId', '==', uid)
        .get()
        .then((snap) => snap.docs.forEach((d) => batch.delete(d.ref)))
    );

    // Sessions: find all sessions for this user, then delete related data
    queries.push(
      this.col(COLLECTIONS.sessions)
        .where('userId', '==', uid)
        .get()
        .then(async (snap) => {
          const sessionIds: string[] = [];
          snap.docs.forEach((doc) => {
            sessionIds.push(doc.id);
            batch.delete(doc.ref);
          });

          // Delete transcripts, answers, notes for each session
          for (const sessionId of sessionIds) {
            const tSnap = await this.col(COLLECTIONS.transcripts)
              .where('sessionId', '==', sessionId)
              .get();
            tSnap.docs.forEach((d) => batch.delete(d.ref));

            const aSnap = await this.col(COLLECTIONS.answers)
              .where('sessionId', '==', sessionId)
              .get();
            aSnap.docs.forEach((d) => batch.delete(d.ref));

            const nSnap = await this.col(COLLECTIONS.notes)
              .where('sessionId', '==', sessionId)
              .get();
            nSnap.docs.forEach((d) => batch.delete(d.ref));
          }
        })
    );

    // Credit transactions
    queries.push(
      this.col(COLLECTIONS.transactions)
        .where('userId', '==', uid)
        .get()
        .then((snap) => snap.docs.forEach((d) => batch.delete(d.ref)))
    );

    await Promise.all(queries);
    await batch.commit();
  }
}
