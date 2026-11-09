export type UserRole = 'super_admin' | 'admin' | 'support' | 'user';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DeviceType = 'desktop' | 'mobile';

export interface UserDevice {
  id: string;
  userId: string;
  deviceType: DeviceType;
  deviceName: string;
  userAgent: string;
  ipAddress: string;
  lastActiveAt: string;
  sessionToken: string;
  isCurrent: boolean;
}

export interface CreditWallet {
  userId: string;
  balanceCredits: number;
  lifetimePurchased: number;
  lifetimeSpent: number;
  updatedAt: string;
}

export type TransactionType = 'purchase' | 'session_deduction' | 'admin_grant' | 'refund';

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  balanceAfter: number;
  description: string;
  referenceId?: string;
  createdAt: string;
}

export type PlanTier = 'starter' | 'pro' | 'executive';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

export interface Subscription {
  id: string;
  userId: string;
  planTier: PlanTier;
  status: SubscriptionStatus;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId?: string;
}

export interface Resume {
  id: string;
  userId: string;
  fileName: string;
  fileSizeBytes: number;
  fileType: string;
  extractedText: string;
  parsedProfile: {
    name?: string;
    headline?: string;
    summary?: string;
    skills: string[];
    experience: {
      role: string;
      company: string;
      duration: string;
      highlights: string[];
    }[];
    education: {
      degree: string;
      institution: string;
      year: string;
    }[];
  };
  isPrimary: boolean;
  createdAt: string;
}

export type DocumentCategory = 'company_research' | 'job_description' | 'brag_sheet' | 'technical_notes';

export interface KnowledgeDocument {
  id: string;
  userId: string;
  title: string;
  category: DocumentCategory;
  fileSizeBytes: number;
  content: string;
  chunkCount: number;
  createdAt: string;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  userId: string;
  chunkIndex: number;
  content: string;
  metadata?: Record<string, string>;
}

export type SessionStatus = 'ready' | 'active' | 'paused' | 'completed';

/** ParakeetAI-style session modes: a real interview vs. a regular call/meeting. */
export type SessionMode = 'interview' | 'meeting';

export interface InterviewSession {
  id: string;
  userId: string;
  targetRole: string;
  targetCompany: string;
  resumeId?: string;
  resumeName?: string;
  status: SessionStatus;
  startedAt: string;
  endedAt?: string;
  totalDurationSeconds: number;
  creditsDeducted: number;
  questionsCount: number;
  overallScore?: number;
  /** 'interview' (default) asks/answers interview questions; 'meeting' tunes the copilot for regular calls. */
  mode?: SessionMode;
  /** User-authored standing instructions injected into every answer prompt (max 20k chars). */
  instructions?: string;
  /** BCP-47 language code for speech recognition and answer language, e.g. 'en-US'. */
  language?: string;
}

export type SpeakerRole = 'interviewer' | 'candidate';

export interface TranscriptLine {
  id: string;
  sessionId: string;
  speaker: SpeakerRole;
  text: string;
  isQuestion: boolean;
  confidence: number;
  category?: 'behavioral' | 'technical' | 'coding' | 'smalltalk';
  timestamp: string;
}

export type AnswerStyle =
  | 'star'
  | 'concise'
  | 'technical'
  | 'step_by_step'
  | 'bullets'
  | 'full_script';

export interface SessionAnswer {
  id: string;
  sessionId: string;
  questionText: string;
  category: 'behavioral' | 'technical' | 'coding' | 'smalltalk';
  answerText: string;
  answerStyle: AnswerStyle;
  starBreakdown?: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
  groundingSources: string[];
  confidenceScore: number;
  saved: boolean;
  createdAt: string;
}

export interface SessionNotes {
  id: string;
  sessionId: string;
  userId: string;
  executiveSummary: string;
  keyTopicsDiscussed: string[];
  actionItems: string[];
  candidateStrengths: string[];
  areasForImprovement: string[];
  thankYouEmailDraft: string;
  createdAt: string;
}

export interface CodingProblem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  language: string;
  starterCode: string;
  userCode: string;
  approach?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  explanation?: string;
  suggestedSolution?: string;
  testCases?: { input: string; expected: string; result?: string; passed?: boolean }[];
}

export interface AdminSettings {
  activeAiProvider: 'google_gemini';
  defaultModel: string;
  costPerCreditUsd: number;
  creditsPerMinute: number;
  maintenanceMode: boolean;
  maxSessionsPerUser: number;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  adminUserId: string;
  adminEmail: string;
  targetUserId?: string;
  action: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}
