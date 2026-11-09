import {
  User,
  UserDevice,
  CreditWallet,
  CreditTransaction,
  TransactionType,
  Subscription,
  PlanTier,
  Resume,
  KnowledgeDocument,
  InterviewSession,
  TranscriptLine,
  SessionAnswer,
  SessionNotes,
  AdminSettings,
  AuditLog,
} from '../types';

export interface CreditChangeResult {
  success: boolean;
  balanceAfter: number;
  error?: string;
}

export interface DeviceRegistrationResult {
  device: UserDevice;
  revokedOldDevice?: UserDevice;
}

/** Provisioning payload for a freshly authenticated Firebase Auth account. */
export interface NewUserAccount {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  emailVerified?: boolean;
}

/**
 * Persistence contract shared by the local JSON file store (development /
 * no-credentials fallback) and the Firestore store (production).
 * Every method is async so callers never have to branch on the backend.
 */
export interface DataStore {
  readonly kind: 'file' | 'firestore';

  // Users & devices
  ensureUser(account: NewUserAccount): Promise<User>;
  getUser(uid: string): Promise<User | undefined>;
  getDevices(userId: string): Promise<UserDevice[]>;
  registerDevice(
    userId: string,
    deviceType: 'desktop' | 'mobile',
    deviceName: string,
    userAgent: string,
    ipAddress: string
  ): Promise<DeviceRegistrationResult>;
  revokeDevice(deviceId: string, userId: string): Promise<boolean>;

  // Wallet & credits
  getWallet(userId: string): Promise<CreditWallet>;
  deductCredits(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string
  ): Promise<CreditChangeResult>;
  addCredits(
    userId: string,
    amount: number,
    type: TransactionType,
    description: string
  ): Promise<CreditWallet>;
  getTransactions(userId: string): Promise<CreditTransaction[]>;

  // Subscriptions
  getSubscription(userId: string): Promise<Subscription>;
  updateSubscription(userId: string, planTier: PlanTier): Promise<Subscription>;

  // Resumes
  getResumes(userId: string): Promise<Resume[]>;
  addResume(resume: Resume): Promise<Resume>;
  setPrimaryResume(resumeId: string, userId: string): Promise<boolean>;
  deleteResume(resumeId: string, userId: string): Promise<boolean>;

  // Knowledge documents
  getDocuments(userId: string): Promise<KnowledgeDocument[]>;
  addDocument(doc: KnowledgeDocument): Promise<KnowledgeDocument>;
  deleteDocument(documentId: string, userId: string): Promise<boolean>;

  // Sessions
  getSessions(userId: string): Promise<InterviewSession[]>;
  getSession(sessionId: string): Promise<InterviewSession | undefined>;
  createSession(session: InterviewSession): Promise<InterviewSession>;
  updateSessionStatus(
    sessionId: string,
    status: InterviewSession['status'],
    durationDelta?: number,
    patch?: Partial<InterviewSession>
  ): Promise<InterviewSession | undefined>;
  addTranscriptLine(sessionId: string, line: TranscriptLine): Promise<TranscriptLine>;
  getTranscripts(sessionId: string): Promise<TranscriptLine[]>;
  addAnswer(sessionId: string, answer: SessionAnswer): Promise<SessionAnswer>;
  getAnswers(sessionId: string): Promise<SessionAnswer[]>;
  getSessionNotes(sessionId: string): Promise<SessionNotes | undefined>;
  saveSessionNotes(notes: SessionNotes): Promise<SessionNotes>;

  // Admin console
  getState(): Promise<{
    users: User[];
    wallets: Record<string, CreditWallet>;
    subscriptions: Record<string, Subscription>;
    sessions: InterviewSession[];
    adminSettings: AdminSettings;
  }>;
  getAuditLogs(): Promise<AuditLog[]>;
  addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog>;
  getAdminSettings(): Promise<AdminSettings>;
  updateAdminSettings(settings: Partial<AdminSettings>): Promise<AdminSettings>;
}
