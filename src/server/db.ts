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

const INITIAL_USER: User = {
  uid: 'user_dev_01',
  email: 'thegreatsinx@gmail.com',
  displayName: 'Alex Rivers',
  role: 'super_admin',
  emailVerified: true,
  createdAt: '2026-10-15T09:00:00Z',
  updatedAt: new Date().toISOString(),
};

const INITIAL_WALLET: CreditWallet = {
  userId: INITIAL_USER.uid,
  balanceCredits: 450,
  lifetimePurchased: 600,
  lifetimeSpent: 150,
  updatedAt: new Date().toISOString(),
};

const INITIAL_SUBSCRIPTION: Subscription = {
  id: 'sub_pro_101',
  userId: INITIAL_USER.uid,
  planTier: 'pro',
  status: 'active',
  currentPeriodEnd: '2026-12-15T00:00:00Z',
  cancelAtPeriodEnd: false,
};

const INITIAL_DEVICES: UserDevice[] = [
  {
    id: 'dev_macbook_pro',
    userId: INITIAL_USER.uid,
    deviceType: 'desktop',
    deviceName: 'MacBook Pro (Chrome)',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    ipAddress: '192.168.1.104',
    lastActiveAt: new Date().toISOString(),
    sessionToken: 'tok_desk_active_981',
    isCurrent: true,
  },
];

const INITIAL_RESUME: Resume = {
  id: 'res_primary_01',
  userId: INITIAL_USER.uid,
  fileName: 'Alex_Rivers_Staff_Software_Engineer.pdf',
  fileSizeBytes: 245000,
  fileType: 'application/pdf',
  extractedText: `Alex Rivers - Staff Software Engineer
Summary: Results-oriented software architect with 8+ years experience scaling high-throughput distributed systems and cloud platforms.
Technical Skills: TypeScript, Go, Python, React, Distributed Systems, Kubernetes, Kafka, Redis, PostgreSQL, AWS, Microservices.
Experience:
- Staff Software Engineer at Stripe (2022 - Present): Led redesign of real-time payout processing pipeline, reducing latency by 42% for $12B annual volume. Architected idempotent transaction workflows handling 85,000 requests/sec.
- Senior Backend Engineer at Airbnb (2019 - 2022): Designed and deployed resilient booking state machine. Reduced booking failure rate by 3.8% across millions of global reservations.
- Software Engineer at Datadog (2017 - 2019): Built metrics aggregation collectors and time-series visualization pipelines in Go and React.
Education:
- B.S. in Computer Science, University of California, Berkeley (2017)`,
  parsedProfile: {
    name: 'Alex Rivers',
    headline: 'Staff Software Engineer & Distributed Systems Architect',
    summary: 'Results-oriented software architect with 8+ years experience scaling high-throughput distributed systems.',
    skills: [
      'Distributed Systems',
      'TypeScript',
      'Go',
      'Python',
      'React',
      'Kafka',
      'PostgreSQL',
      'Kubernetes',
      'AWS',
      'Redis',
      'High Throughput Architecture',
    ],
    experience: [
      {
        role: 'Staff Software Engineer',
        company: 'Stripe',
        duration: '2022 - Present',
        highlights: [
          'Led redesign of real-time payout processing pipeline, reducing latency by 42% for $12B volume.',
          'Architected idempotent transaction workflows processing 85,000 requests/second with 99.999% uptime.',
        ],
      },
      {
        role: 'Senior Backend Engineer',
        company: 'Airbnb',
        duration: '2019 - 2022',
        highlights: [
          'Engineered resilient booking state machine, reducing failure rate by 3.8% across global reservation traffic.',
          'Mentored 6 junior/mid engineers and established company-wide distributed tracing guidelines.',
        ],
      },
    ],
    education: [
      {
        degree: 'B.S. in Computer Science',
        institution: 'UC Berkeley',
        year: '2017',
      },
    ],
  },
  isPrimary: true,
  createdAt: '2026-10-18T10:30:00Z',
};

const INITIAL_DOCUMENTS: KnowledgeDocument[] = [
  {
    id: 'doc_google_prep',
    userId: INITIAL_USER.uid,
    title: 'Google System Design & Leadership Principles Prep',
    category: 'company_research',
    fileSizeBytes: 84000,
    content: `Google Technical Leadership & Engineering Culture:
- Focus on Googleyness: Intellectual humility, thriving on ambiguity, proactive bias for action, and doing what's right for the user.
- System Design Focus: Horizontal scalability, fault isolation, graceful degradation under network partition, CAP theorem tradeoffs.
- Key Accomplishment to Highlight: At Stripe, when downstream banking partner experienced 20% timeout spikes, devised circuit breaker with exponential backoff and jitter that prevented cascading failures.`,
    chunkCount: 3,
    createdAt: '2026-10-20T14:15:00Z',
  },
];

const INITIAL_SESSIONS: InterviewSession[] = [
  {
    id: 'sess_demo_01',
    userId: INITIAL_USER.uid,
    targetRole: 'Staff Software Engineer',
    targetCompany: 'Google Cloud Platform',
    resumeId: INITIAL_RESUME.id,
    resumeName: INITIAL_RESUME.fileName,
    status: 'completed',
    startedAt: '2026-11-06T15:00:00Z',
    endedAt: '2026-11-06T15:45:00Z',
    totalDurationSeconds: 2700,
    creditsDeducted: 45,
    questionsCount: 4,
    overallScore: 94,
  },
];

const INITIAL_STATE: DatabaseState = {
  users: [INITIAL_USER],
  devices: INITIAL_DEVICES,
  wallets: { [INITIAL_USER.uid]: INITIAL_WALLET },
  transactions: [
    {
      id: 'tx_init_01',
      userId: INITIAL_USER.uid,
      amount: 500,
      type: 'purchase',
      balanceAfter: 500,
      description: 'Pro Plan Monthly Credit Pack (500 credits)',
      createdAt: '2026-10-15T09:05:00Z',
    },
    {
      id: 'tx_init_02',
      userId: INITIAL_USER.uid,
      amount: -45,
      type: 'session_deduction',
      balanceAfter: 455,
      description: 'GCP Staff Engineer Mock Session (45 mins)',
      referenceId: 'sess_demo_01',
      createdAt: '2026-11-06T15:45:00Z',
    },
  ],
  subscriptions: { [INITIAL_USER.uid]: INITIAL_SUBSCRIPTION },
  resumes: [INITIAL_RESUME],
  documents: INITIAL_DOCUMENTS,
  sessions: INITIAL_SESSIONS,
  transcripts: {
    sess_demo_01: [
      {
        id: 'tr_01',
        sessionId: 'sess_demo_01',
        speaker: 'interviewer',
        text: 'Hello Alex, thanks for joining us today. To start off, could you tell us about a time you designed a high-throughput distributed system under severe latency constraints?',
        isQuestion: true,
        confidence: 0.98,
        category: 'technical',
        timestamp: '15:02:10',
      },
      {
        id: 'tr_02',
        sessionId: 'sess_demo_01',
        speaker: 'candidate',
        text: 'Certainly! At Stripe, I led the architectural overhaul of our real-time payout processing pipeline, where we needed sub-50ms latency across 85,000 requests per second.',
        isQuestion: false,
        confidence: 0.95,
        timestamp: '15:03:00',
      },
    ],
  },
  answers: {
    sess_demo_01: [
      {
        id: 'ans_01',
        sessionId: 'sess_demo_01',
        questionText: 'Could you tell us about a time you designed a high-throughput distributed system under severe latency constraints?',
        category: 'technical',
        answerText: 'Highlight your Stripe payout pipeline overhaul. Break down: Situation (Legacy batch payout pipeline bottlenecking at 85k req/s), Task (Reduce latency under 50ms while maintaining strict exactly-once payment guarantees), Action (Migrated from synchronous relational writes to an event-driven architecture using Kafka, Redis caching layer with write-behind queues, and partitioned idempotency keys), Result (Cut p99 latency by 42% and supported $12B annual volume with zero duplicate transactions).',
        answerStyle: 'star',
        starBreakdown: {
          situation: 'At Stripe, our core payout pipeline faced latency spikes up to 450ms during peak merchant settlement windows.',
          task: 'I was tasked with redesigning the ingestion and execution pipeline to achieve sub-50ms p99 latency without compromising strict financial idempotency.',
          action: 'Architected an event-driven stream using Kafka partitioned by merchant ID, backed by Redis for in-memory ledger lock verification and asynchronous database flush.',
          result: 'Reduced p99 latency by 42%, achieved 85,000 req/sec sustained throughput, and supported $12B in processed transactions without a single duplicate payout.',
        },
        groundingSources: ['Resume: Stripe - Staff Software Engineer', 'Knowledge: High Throughput Architecture'],
        confidenceScore: 0.96,
        saved: true,
        createdAt: '2026-11-06T15:02:25Z',
      },
    ],
  },
  notes: {
    sess_demo_01: {
      id: 'note_demo_01',
      sessionId: 'sess_demo_01',
      userId: INITIAL_USER.uid,
      executiveSummary: 'Strong technical interview demonstrating deep mastery of distributed systems, concurrency guarantees, and system resilience. Clear articulation using the STAR framework.',
      keyTopicsDiscussed: ['Idempotency in Financial Systems', 'Kafka Partitioning Strategies', 'Circuit Breakers & Exponential Backoff', 'P99 Latency Optimization'],
      actionItems: ['Prepare further depth on CAP theorem tradeoffs in cross-region replication', 'Follow up with thank-you email referencing the circuit breaker discussion'],
      candidateStrengths: ['Quantifiable business impact metrics cited accurately', 'Structured communication without meandering', 'Seamless integration of actual Stripe experience'],
      areasForImprovement: ['Elaborate more on disaster recovery and database shard failover protocols'],
      thankYouEmailDraft: 'Hi GCP Hiring Team, Thank you for the insightful conversation today regarding your distributed cloud platform challenges. I especially enjoyed discussing partition strategies and idempotent ledger design...',
      createdAt: '2026-11-06T15:46:00Z',
    },
  },
  adminSettings: {
    activeAiProvider: 'google_gemini',
    defaultModel: 'gemini-3.8-flash',
    costPerCreditUsd: 0.10,
    creditsPerMinute: 1,
    maintenanceMode: false,
    maxSessionsPerUser: 10,
    updatedAt: new Date().toISOString(),
  },
  auditLogs: [
    {
      id: 'aud_01',
      adminUserId: INITIAL_USER.uid,
      adminEmail: INITIAL_USER.email,
      action: 'SYSTEM_BOOTSTRAP',
      details: 'AskMeAi platform initialized with verified security rules and credit wallets.',
      ipAddress: '127.0.0.1',
      timestamp: '2026-10-15T09:00:00Z',
    },
  ],
  supportTickets: [],
};

export class Database {
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

  public getState(): DatabaseState {
    return this.state;
  }

  // --- Users & Devices ---
  public getUser(uid: string): User | undefined {
    return this.state.users.find((u) => u.uid === uid);
  }

  public getDevices(userId: string): UserDevice[] {
    return this.state.devices.filter((d) => d.userId === userId);
  }

  public registerDevice(
    userId: string,
    deviceType: 'desktop' | 'mobile',
    deviceName: string,
    userAgent: string,
    ipAddress: string
  ): { device: UserDevice; revokedOldDevice?: UserDevice } {
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

  public revokeDevice(deviceId: string, userId: string): boolean {
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
  public getWallet(userId: string): CreditWallet {
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

  public deductCredits(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string
  ): { success: boolean; balanceAfter: number; error?: string } {
    const wallet = this.getWallet(userId);
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

  public addCredits(
    userId: string,
    amount: number,
    type: 'purchase' | 'admin_grant' | 'refund' | 'session_deduction',
    description: string
  ): CreditWallet {
    const wallet = this.getWallet(userId);
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

  public getTransactions(userId: string): CreditTransaction[] {
    return this.state.transactions.filter((tx) => tx.userId === userId);
  }

  // --- Subscriptions ---
  public getSubscription(userId: string): Subscription {
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

  public updateSubscription(
    userId: string,
    planTier: 'starter' | 'pro' | 'executive'
  ): Subscription {
    const sub = this.getSubscription(userId);
    sub.planTier = planTier;
    sub.currentPeriodEnd = new Date(Date.now() + 30 * 86400000).toISOString();
    
    // Add bonus monthly credits based on plan
    const creditBonus = planTier === 'executive' ? 1500 : planTier === 'pro' ? 500 : 50;
    this.addCredits(userId, creditBonus, 'purchase', `${planTier.toUpperCase()} Plan Subscription Bonus (${creditBonus} credits)`);

    this.save();
    return sub;
  }

  // --- Resumes & Documents ---
  public getResumes(userId: string): Resume[] {
    return this.state.resumes.filter((r) => r.userId === userId);
  }

  public addResume(resume: Resume): Resume {
    if (resume.isPrimary) {
      this.state.resumes.forEach((r) => {
        if (r.userId === resume.userId) r.isPrimary = false;
      });
    }
    this.state.resumes.unshift(resume);
    this.save();
    return resume;
  }

  public setPrimaryResume(resumeId: string, userId: string): boolean {
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

  public deleteResume(resumeId: string, userId: string): boolean {
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

  public getDocuments(userId: string): KnowledgeDocument[] {
    return this.state.documents.filter((d) => d.userId === userId);
  }

  public addDocument(doc: KnowledgeDocument): KnowledgeDocument {
    this.state.documents.unshift(doc);
    this.save();
    return doc;
  }

  public deleteDocument(documentId: string, userId: string): boolean {
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
  public getSessions(userId: string): InterviewSession[] {
    return this.state.sessions.filter((s) => s.userId === userId);
  }

  public getSession(sessionId: string): InterviewSession | undefined {
    return this.state.sessions.find((s) => s.id === sessionId);
  }

  public createSession(session: InterviewSession): InterviewSession {
    this.state.sessions.unshift(session);
    this.state.transcripts[session.id] = [];
    this.state.answers[session.id] = [];
    this.save();
    return session;
  }

  public updateSessionStatus(
    sessionId: string,
    status: InterviewSession['status'],
    durationDelta = 0
  ): InterviewSession | undefined {
    const session = this.getSession(sessionId);
    if (session) {
      session.status = status;
      session.totalDurationSeconds += durationDelta;
      if (status === 'completed') {
        session.endedAt = new Date().toISOString();
      }
      this.save();
    }
    return session;
  }

  public addTranscriptLine(sessionId: string, line: TranscriptLine): TranscriptLine {
    if (!this.state.transcripts[sessionId]) {
      this.state.transcripts[sessionId] = [];
    }
    this.state.transcripts[sessionId].push(line);
    const session = this.getSession(sessionId);
    if (session && line.isQuestion) {
      session.questionsCount += 1;
    }
    this.save();
    return line;
  }

  public getTranscripts(sessionId: string): TranscriptLine[] {
    return this.state.transcripts[sessionId] || [];
  }

  public addAnswer(sessionId: string, answer: SessionAnswer): SessionAnswer {
    if (!this.state.answers[sessionId]) {
      this.state.answers[sessionId] = [];
    }
    this.state.answers[sessionId].unshift(answer);
    this.save();
    return answer;
  }

  public getAnswers(sessionId: string): SessionAnswer[] {
    return this.state.answers[sessionId] || [];
  }

  public getSessionNotes(sessionId: string): SessionNotes | undefined {
    return this.state.notes[sessionId];
  }

  public saveSessionNotes(notes: SessionNotes): SessionNotes {
    this.state.notes[notes.sessionId] = notes;
    this.save();
    return notes;
  }

  // --- Admin ---
  public getAuditLogs(): AuditLog[] {
    return this.state.auditLogs;
  }

  public addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const entry: AuditLog = {
      id: 'aud_' + Math.random().toString(36).substring(2, 9),
      ...log,
      timestamp: new Date().toISOString(),
    };
    this.state.auditLogs.unshift(entry);
    this.save();
    return entry;
  }
}

export const db = new Database();
