import {
  User,
  UserRole,
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
  AuditLog,
} from '../types';

/**
 * Demo content shared by the local JSON file store and the Firestore store.
 * It gives every brand-new account a realistic workspace (sample resume,
 * knowledge document and a completed mock interview) so the product can be
 * explored immediately after sign-up.
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
  /** Include sample resumes, documents and a completed session (default true). */
  demo?: boolean;
  /** Devices already provisioned for this account. */
  devices?: UserDevice[];
}

export function createDemoSeed(
  userId: string,
  email: string,
  displayName: string,
  options: SeedOptions = {}
): DemoSeed {
  const demo = options.demo !== false;
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

  const wallet: CreditWallet = demo
    ? {
        userId,
        balanceCredits: 450,
        lifetimePurchased: 600,
        lifetimeSpent: 150,
        updatedAt: now,
      }
    : {
        userId,
        balanceCredits: 100,
        lifetimePurchased: 100,
        lifetimeSpent: 0,
        updatedAt: now,
      };

  const subscription: Subscription = {
    id: 'sub_' + Math.random().toString(36).substring(2, 10),
    userId,
    planTier: demo ? 'pro' : 'starter',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    cancelAtPeriodEnd: false,
  };

  const resume: Resume = {
    id: `res_${userId}_primary`,
    userId,
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
      name: displayName || 'Alex Rivers',
      headline: 'Staff Software Engineer & Distributed Systems Architect',
      summary:
        'Results-oriented software architect with 8+ years experience scaling high-throughput distributed systems.',
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

  const document: KnowledgeDocument = {
    id: `doc_${userId}_google_prep`,
    userId,
    title: 'Google System Design & Leadership Principles Prep',
    category: 'company_research',
    fileSizeBytes: 84000,
    content: `Google Technical Leadership & Engineering Culture:
- Focus on Googleyness: Intellectual humility, thriving on ambiguity, proactive bias for action, and doing what's right for the user.
- System Design Focus: Horizontal scalability, fault isolation, graceful degradation under network partition, CAP theorem tradeoffs.
- Key Accomplishment to Highlight: At Stripe, when downstream banking partner experienced 20% timeout spikes, devised circuit breaker with exponential backoff and jitter that prevented cascading failures.`,
    chunkCount: 3,
    createdAt: '2026-10-20T14:15:00Z',
  };

  const session: InterviewSession = {
    id: `sess_${userId}_demo`,
    userId,
    targetRole: 'Staff Software Engineer',
    targetCompany: 'Google Cloud Platform',
    resumeId: resume.id,
    resumeName: resume.fileName,
    status: 'completed',
    startedAt: '2026-11-06T15:00:00Z',
    endedAt: '2026-11-06T15:45:00Z',
    totalDurationSeconds: 2700,
    creditsDeducted: 45,
    questionsCount: 4,
    overallScore: 94,
  };

  const transactions: CreditTransaction[] = demo
    ? [
        {
          id: `tx_${userId}_init_01`,
          userId,
          amount: 500,
          type: 'purchase',
          balanceAfter: 500,
          description: 'Pro Plan Monthly Credit Pack (500 credits)',
          createdAt: '2026-10-15T09:05:00Z',
        },
        {
          id: `tx_${userId}_init_02`,
          userId,
          amount: -45,
          type: 'session_deduction',
          balanceAfter: 455,
          description: 'GCP Staff Engineer Mock Session (45 mins)',
          referenceId: session.id,
          createdAt: '2026-11-06T15:45:00Z',
        },
      ]
    : [];

  const transcripts: TranscriptLine[] = demo
    ? [
        {
          id: `tr_${userId}_01`,
          sessionId: session.id,
          speaker: 'interviewer',
          text: 'Hello Alex, thanks for joining us today. To start off, could you tell us about a time you designed a high-throughput distributed system under severe latency constraints?',
          isQuestion: true,
          confidence: 0.98,
          category: 'technical',
          timestamp: '15:02:10',
        },
        {
          id: `tr_${userId}_02`,
          sessionId: session.id,
          speaker: 'candidate',
          text: 'Certainly! At Stripe, I led the architectural overhaul of our real-time payout processing pipeline, where we needed sub-50ms latency across 85,000 requests per second.',
          isQuestion: false,
          confidence: 0.95,
          timestamp: '15:03:00',
        },
      ]
    : [];

  const answers: SessionAnswer[] = demo
    ? [
        {
          id: `ans_${userId}_01`,
          sessionId: session.id,
          questionText:
            'Could you tell us about a time you designed a high-throughput distributed system under severe latency constraints?',
          category: 'technical',
          answerText:
            'Highlight your Stripe payout pipeline overhaul. Break down: Situation (Legacy batch payout pipeline bottlenecking at 85k req/s), Task (Reduce latency under 50ms while maintaining strict exactly-once payment guarantees), Action (Migrated from synchronous relational writes to an event-driven architecture using Kafka, Redis caching layer with write-behind queues, and partitioned idempotency keys), Result (Cut p99 latency by 42% and supported $12B annual volume with zero duplicate transactions).',
          answerStyle: 'star',
          starBreakdown: {
            situation:
              'At Stripe, our core payout pipeline faced latency spikes up to 450ms during peak merchant settlement windows.',
            task: 'I was tasked with redesigning the ingestion and execution pipeline to achieve sub-50ms p99 latency without compromising strict financial idempotency.',
            action:
              'Architected an event-driven stream using Kafka partitioned by merchant ID, backed by Redis for in-memory ledger lock verification and asynchronous database flush.',
            result:
              'Reduced p99 latency by 42%, achieved 85,000 req/sec sustained throughput, and supported $12B in processed transactions without a single duplicate payout.',
          },
          groundingSources: [
            'Resume: Stripe - Staff Software Engineer',
            'Knowledge: High Throughput Architecture',
          ],
          confidenceScore: 0.96,
          saved: true,
          createdAt: '2026-11-06T15:02:25Z',
        },
      ]
    : [];

  const notes: SessionNotes[] = demo
    ? [
        {
          id: `note_${userId}_demo`,
          sessionId: session.id,
          userId,
          executiveSummary:
            'Strong technical interview demonstrating deep mastery of distributed systems, concurrency guarantees, and system resilience. Clear articulation using the STAR framework.',
          keyTopicsDiscussed: [
            'Idempotency in Financial Systems',
            'Kafka Partitioning Strategies',
            'Circuit Breakers & Exponential Backoff',
            'P99 Latency Optimization',
          ],
          actionItems: [
            'Prepare further depth on CAP theorem tradeoffs in cross-region replication',
            'Follow up with thank-you email referencing the circuit breaker discussion',
          ],
          candidateStrengths: [
            'Quantifiable business impact metrics cited accurately',
            'Structured communication without meandering',
            'Seamless integration of actual Stripe experience',
          ],
          areasForImprovement: [
            'Elaborate more on disaster recovery and database shard failover protocols',
          ],
          thankYouEmailDraft:
            'Hi GCP Hiring Team, Thank you for the insightful conversation today regarding your distributed cloud platform challenges. I especially enjoyed discussing partition strategies and idempotent ledger design...',
          createdAt: '2026-11-06T15:46:00Z',
        },
      ]
    : [];

  const auditLogs: AuditLog[] = [
    {
      id: 'aud_' + Math.random().toString(36).substring(2, 9),
      adminUserId: userId,
      adminEmail: email,
      action: 'ACCOUNT_PROVISIONED',
      details: `AskMeAi account provisioned for ${email}.`,
      ipAddress: '127.0.0.1',
      timestamp: now,
    },
  ];

  return {
    user,
    wallet,
    subscription,
    devices: options.devices || [],
    resumes: demo ? [resume] : [],
    documents: demo ? [document] : [],
    sessions: demo ? [session] : [],
    transactions,
    transcripts: demo ? { [session.id]: transcripts } : {},
    answers: demo ? { [session.id]: answers } : {},
    notes: notes[0] ? { [session.id]: notes[0] } : {},
    auditLogs,
  };
}
