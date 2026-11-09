import {
  User,
  UserRole,
  UserDevice,
  CreditWallet,
  Subscription,
  Resume,
  KnowledgeDocument,
  InterviewSession,
  TranscriptLine,
  SessionAnswer,
  SessionNotes,
  AuditLog,
  CreditTransaction,
} from '../types';

/**
 * Empty seed for new accounts. No sample resumes, documents, sessions,
 * transcripts, answers, or notes are provisioned. Accounts start blank
 * and users upload their own content.
 */
export interface DemoSeed {
  user: User;
  wallet: CreditWallet;
  subscription: Subscription;
  devices: UserDevice[];
  resumes: Resume[];
  documents: KnowledgeDocument[];
  sessions: InterviewSession[];
  transactions: CreditTransaction[];
  transcripts: Record<string, TranscriptLine[]>;
  answers: Record<string, SessionAnswer[]>;
  notes: Record<string, SessionNotes>;
  auditLogs: AuditLog[];
}

/** E-mail addresses that are promoted to super_admin on first provisioning. */
export const SUPER_ADMIN_EMAILS = ['thegreatsinx@gmail.com'];

export function roleForEmail(email?: string | null): UserRole {
  if (email && SUPER_ADMIN_EMAILS.includes(email.toLowerCase())) return 'super_admin';
  return 'user';
}

export interface SeedOptions {
  /** Devices already provisioned for this account. */
  devices?: UserDevice[];
}

export function createDemoSeed(
  userId: string,
  email: string,
  displayName: string,
  options: SeedOptions = {}
): DemoSeed {
  const now = new Date().toISOString();
  const user: User = {
    uid: userId,
    email,
    displayName,
    role: roleForEmail(email),
    emailVerified: false,
    createdAt: now,
    updatedAt: now,
  };

  const wallet: CreditWallet = {
    userId,
    balanceCredits: 100,
    lifetimePurchased: 100,
    lifetimeSpent: 0,
    updatedAt: now,
  };

  const subscription: Subscription = {
    id: 'sub_' + Math.random().toString(36).substring(2, 10),
    userId,
    planTier: 'starter',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    cancelAtPeriodEnd: false,
  };

  return {
    user,
    wallet,
    subscription,
    devices: options.devices || [],
    resumes: [],
    documents: [],
    sessions: [],
    transactions: [],
    transcripts: {},
    answers: {},
    notes: {},
    auditLogs: [],
  };
}
