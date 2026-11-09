/**
 * In-browser demo backend.
 *
 * Used automatically when a page is served without the Express API in front of
 * it - the static Cloudflare deploy, `npm run preview`, or any static host.
 * It mirrors the routes in server.ts so the UI runs unchanged.
 *
 * Security properties (this is why it is safe to ship in a public bundle):
 *   - reads and writes only this browser's localStorage
 *   - makes no network requests at all: answers, analyses and notes are
 *     composed locally from templates
 *   - embeds no credentials, no API keys and no tokens
 *   - nothing a visitor types ever leaves their browser
 *
 * Reset the demo at any time with:  localStorage.removeItem('askmeai.demo.v1')
 */
import { createDemoSeed, type DemoSeed } from '../server/demoSeed';
import type {
  AdminSettings,
  AnswerStyle,
  CreditTransaction,
  DocumentCategory,
  InterviewSession,
  KnowledgeDocument,
  Resume,
  SessionAnswer,
  SessionNotes,
  TranscriptLine,
  UserDevice,
  UserRole,
} from '../types';

const STORAGE_KEY = 'askmeai.demo.v1';
const DEMO_UID = 'demo-user';

interface DemoState extends DemoSeed {
  adminSettings: AdminSettings;
}

const DEFAULT_SETTINGS: AdminSettings = {
  activeAiProvider: 'google_gemini',
  defaultModel: 'gemini-3.5-flash',
  costPerCreditUsd: 0.01,
  creditsPerMinute: 6,
  maintenanceMode: false,
  maxSessionsPerUser: 10,
  // Invitation-only demo: only the demo account is enrolled by default.
  enrolledEmails: ['demo@askmeai.local'],
  updatedAt: '2026-01-01T00:00:00.000Z',
};

let cached: DemoState | null = null;

function state(): DemoState {
  if (cached) return cached;

  let loaded: DemoState | null = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) loaded = JSON.parse(raw) as DemoState;
  } catch {
    loaded = null; // corrupted or unavailable storage - fall through to a fresh seed
  }

  if (!loaded || !loaded.user || !loaded.wallet) {
    const seed = createDemoSeed(DEMO_UID, 'demo@askmeai.local', 'Demo Explorer', { demo: true });
    // Visitors may open the admin console; every figure there is canned data.
    seed.user.role = 'super_admin';
    loaded = { ...seed, adminSettings: { ...DEFAULT_SETTINGS } };
  }
  if (!loaded.adminSettings) loaded.adminSettings = { ...DEFAULT_SETTINGS };

  cached = loaded;
  return cached;
}

function save(): void {
  if (!cached) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {
    /* private mode / quota exceeded: the session still works in memory */
  }
}

const now = () => new Date().toISOString();
const makeId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

function categoryFor(text: string): SessionAnswer['category'] {
  const t = (text || '').toLowerCase();
  if (/(algorithm|complexity|code|function|array|recursion|database|sql|system design|scale)/.test(t)) {
    return t.includes('design') ? 'technical' : 'coding';
  }
  if (/(tell me about|yourself|strength|weakness|challenge|conflict|team|failure|why .* company|goal)/.test(t)) {
    return 'behavioral';
  }
  if (/(how are you|weather|coffee|weekend)/.test(t)) return 'smalltalk';
  return 'technical';
}

/** Local, template-driven answer generator - no model, no network. */
function composeAnswer(question: string, style: AnswerStyle, role: string): { text: string; star?: SessionAnswer['starBreakdown'] } {
  const topic = (question || 'that question').trim().replace(/\s+/g, ' ').slice(0, 160);
  const star = {
    situation: `In my previous role as ${role}, our team ran into a situation directly related to: ${topic}`,
    task: `I owned the outcome end to end - designing the approach, aligning the team and making sure it shipped without disrupting our users.`,
    action:
      'I broke the problem into small, verifiable steps, wrote the plan down so everyone shared one source of truth, reviewed the riskiest part first, and checked in with stakeholders at each milestone.',
    result:
      'We delivered ahead of the agreed date, cut the recurring effort involved by more than half, and the process we documented became the team default for later projects.',
  };

  if (style === 'concise') {
    return {
      text: `Short version: I have handled this exact class of problem before. I start by defining what "done" looks like, take the highest-risk piece first, and keep the loop tight with quick check-ins. In my last role that approach let us ship early with fewer regressions, and I would apply the same discipline here - focused, measurable, and communicated clearly.`,
    };
  }

  if (style === 'technical') {
    return {
      text: `Technical walkthrough for: ${topic}

1. Clarify the constraints first - inputs, scale, latency budget and failure modes - because those decide the design more than any single algorithm does.
2. Start with the simplest correct solution, measure it, then optimise only the part the profile says is hot.
3. Watch the usual traps: unbounded growth, N+1 access patterns, hidden synchronisation and error paths nobody tests.
4. Prove it with a couple of representative cases plus one edge case, and state the complexity out loud.

Complexity: time O(n) for the straightforward pass, O(n log n) if a sort or heap is involved; space O(1) extra beyond the output.

I would summarise trade-offs to the interviewer as I go, so the reasoning is visible - not just the final answer.`,
    };
  }

  if (style === 'step_by_step') {
    return {
      text: `Step by step for: ${topic}

Step 1 - Restate the problem in one sentence and confirm the expected output.
Step 2 - List the constraints and pick the data structure that makes them cheap.
Step 3 - Work a small example by hand, including the awkward edge case.
Step 4 - Write the solution in clear, named steps rather than clever one-liners.
Step 5 - Walk through your example against the code, line by line.
Step 6 - State time and space complexity, then mention how you would test it in production.

That sequence keeps me from coding before I understand the problem, which is where most candidates lose time.`,
    };
  }

  if (style === 'bullets') {
    return {
      text: `Key talking points for: ${topic}

• Context — I have solved this class of problem before: I define what "done" looks like first, then take the highest-risk piece.
• Action — I wrote the plan down as one shared source of truth, reviewed the riskiest part first, and checked in at each milestone.
• Evidence — in my last role that approach let us ship early with fewer regressions and less recurring effort.
• Result — the team adopted the pattern for later projects, and I would bring the same discipline here: focused, measurable, communicated clearly.`,
    };
  }

  if (style === 'full_script') {
    return {
      text: `Thanks for the question - happy to answer it.

${star.situation}

${star.task}

${star.action}

${star.result}

So the short version is: I focus on the outcome, make the work legible to everyone else, and leave the system easier to change than I found it. I would bring exactly that approach to this role, and I am glad to go deeper on any part of it.`,
      star,
    };
  }

  return {
    text: `Using the STAR method.

S - ${star.situation}

T - ${star.task}

A - ${star.action}

R - ${star.result}

Bottom line: I focus on the outcome, make the work legible to everyone else, and leave the system easier to change than I found it.`,
    star,
  };
}

function notesFor(sessionId: string): SessionNotes {
  const s = state();
  const session = s.sessions.find((x) => x.id === sessionId);
  const answers = s.answers[sessionId] || [];
  const lines = s.transcripts[sessionId] || [];
  const role = session?.targetRole || 'the role';

  return {
    id: makeId('notes'),
    sessionId,
    userId: DEMO_UID,
    executiveSummary: `Mock interview for ${role}${session?.targetCompany ? ` at ${session.targetCompany}` : ''}. ${
      answers.length
        ? `${answers.length} answer${answers.length > 1 ? 's' : ''} generated and reviewed.`
        : 'No answers generated yet - start the studio to record questions.'
    } The candidate stayed concise, structured and outcome-focused throughout.`,
    keyTopicsDiscussed: [
      ...answers.slice(0, 3).map((a) => a.questionText.slice(0, 80)),
      ...(answers.length ? [] : ['Introduction and role motivation']),
      'Trade-offs and prioritisation',
      'How success would be measured',
    ],
    actionItems: [
      'Prepare one quantified example per competency the job description mentions',
      'Rehearse the "tell me about a failure" story out loud until it fits in 90 seconds',
      'Research the company’s last two product launches before the real interview',
    ],
    candidateStrengths: [
      'Clear structure - signposts the answer before going into detail',
      'Concrete, quantified results instead of vague claims',
      'Comfortable discussing trade-offs and unknowns',
    ],
    areasForImprovement: [
      'Tighten the opening sentence of each answer to under 15 seconds',
      'Quantify impact more consistently (%, time saved, users affected)',
      'Close every answer with what was learned',
    ],
    thankYouEmailDraft: `Subject: Great speaking with you today\n\nHi there,\n\nThank you for the conversation about the ${role} role - I enjoyed digging into the problems you described. The point about how the team measures success especially stood out to me, and it lines up with how I like to work: define the outcome, ship the smallest thing that moves it, then measure.\n\nI'd welcome the chance to go deeper on any of the areas we touched. Thanks again for your time.\n\nBest regards`,
    createdAt: now(),
  };
}

function requireSession(id: string): InterviewSession {
  const session = state().sessions.find((x) => x.id === id);
  if (!session) throw new Error('Session not found');
  return session;
}

/**
 * Route table mirroring server.ts. Returns the same JSON the real API would.
 */
export async function demoFetch(path: string, init: RequestInit = {}): Promise<any> {
  const method = (init.method || 'GET').toUpperCase();
  const route = path.split('?')[0];
  let body: any = {};
  if (typeof init.body === 'string') {
    try {
      body = JSON.parse(init.body);
    } catch {
      body = {};
    }
  }

  const s = state();

  // ── State ────────────────────────────────────────────────────────────────
  if (route === '/api/me') {
    return {
      user: s.user,
      devices: s.devices,
      wallet: s.wallet,
      subscription: s.subscription,
      resumes: s.resumes,
      documents: s.documents,
      sessions: s.sessions,
      // Mirror of the server's configured pool so the wizard offers the same ids.
      aiModels: ['gemini-3.5-flash', 'gemini-3.6-flash'],
    };
  }

  // ── Devices (1 desktop + 1 mobile) ──────────────────────────────────────
  if (route === '/api/auth/register-device' && method === 'POST') {
    const deviceType = body.deviceType === 'mobile' ? 'mobile' : 'desktop';
    const device: UserDevice = {
      id: `${DEMO_UID}_${deviceType}`,
      userId: DEMO_UID,
      deviceType,
      deviceName: body.deviceName || (deviceType === 'mobile' ? 'Mobile Browser' : 'Desktop Browser'),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'demo',
      ipAddress: '127.0.0.1',
      lastActiveAt: now(),
      sessionToken: 'demo-session',
      isCurrent: true,
    };
    // Upsert: never report a revocation, so the UI stays quiet on every load.
    s.devices = [...s.devices.filter((d) => d.deviceType !== deviceType), device];
    save();
    return { device, revokedOldDevice: null };
  }

  if (route === '/api/auth/revoke-device' && method === 'POST') {
    s.devices = s.devices.filter((d) => d.id !== body.deviceId);
    save();
    return { success: true };
  }

  // ── Wallet & billing ────────────────────────────────────────────────────
  if (route === '/api/wallet' && method === 'GET') return s.wallet;

  if (route === '/api/wallet/transactions') return s.transactions;

  if (route === '/api/wallet/purchase' && method === 'POST') {
    const amount = Number(body.creditsAmount) || 0;
    s.wallet.balanceCredits += amount;
    s.wallet.lifetimePurchased += amount;
    s.wallet.updatedAt = now();
    const tx: CreditTransaction = {
      id: makeId('tx'),
      userId: DEMO_UID,
      amount,
      type: 'purchase',
      balanceAfter: s.wallet.balanceCredits,
      description: `${body.packName || 'Credit pack'} (demo)`,
      createdAt: now(),
    };
    s.transactions = [tx, ...s.transactions];
    save();
    return { success: true, wallet: s.wallet };
  }

  if (route === '/api/subscriptions/update' && method === 'POST') {
    if (!['starter', 'pro', 'executive'].includes(body.planTier)) throw new Error('Invalid plan tier');
    s.subscription.planTier = body.planTier;
    s.subscription.status = 'active';
    s.subscription.currentPeriodEnd = new Date(Date.now() + 30 * 864e5).toISOString();
    save();
    return { success: true, subscription: s.subscription, wallet: s.wallet };
  }

  // ── Resumes ─────────────────────────────────────────────────────────────
  if (route === '/api/resumes/upload' && method === 'POST') {
    const text: string = body.textContent || 'Uploaded resume (demo content).';
    const resume: Resume = {
      id: makeId('resume'),
      userId: DEMO_UID,
      fileName: body.fileName || 'resume.txt',
      fileSizeBytes: Math.max(1, Math.round((body.fileContentBase64?.length || text.length) * 0.75)),
      fileType: body.fileType || 'txt',
      extractedText: text,
      parsedProfile: {
        name: s.user.displayName,
        headline: 'Demo profile',
        summary: 'Parsed locally for the demo - no file was uploaded anywhere.',
        skills: ['Communication', 'Problem solving', 'Teamwork'],
        experience: [
          {
            role: 'Sample role',
            company: 'Sample company',
            duration: '2022 - present',
            highlights: ['Shipped the work described in this resume', 'Owned outcomes end to end'],
          },
        ],
        education: [{ degree: 'Degree', institution: 'Institution', year: '2018' }],
      },
      isPrimary: s.resumes.length === 0,
      createdAt: now(),
    };
    s.resumes = [resume, ...s.resumes];
    save();
    return resume;
  }

  const primaryMatch = route.match(/^\/api\/resumes\/([^/]+)\/primary$/);
  if (primaryMatch && method === 'POST') {
    s.resumes = s.resumes.map((r) => ({ ...r, isPrimary: r.id === primaryMatch[1] }));
    save();
    return { success: true };
  }

  const resumeMatch = route.match(/^\/api\/resumes\/([^/]+)$/);
  if (resumeMatch && method === 'DELETE') {
    s.resumes = s.resumes.filter((r) => r.id !== resumeMatch[1]);
    save();
    return { success: true };
  }

  // ── Knowledge documents ─────────────────────────────────────────────────
  if (route === '/api/documents/upload' && method === 'POST') {
    if (!body.title || !body.content) throw new Error('Title and content required');
    const doc: KnowledgeDocument = {
      id: makeId('doc'),
      userId: DEMO_UID,
      title: body.title,
      category: (body.category as DocumentCategory) || 'company_research',
      fileSizeBytes: body.content.length,
      content: body.content,
      chunkCount: Math.max(1, Math.ceil(body.content.length / 500)),
      createdAt: now(),
    };
    s.documents = [doc, ...s.documents];
    save();
    return doc;
  }

  const docMatch = route.match(/^\/api\/documents\/([^/]+)$/);
  if (docMatch && method === 'DELETE') {
    s.documents = s.documents.filter((d) => d.id !== docMatch[1]);
    save();
    return { success: true };
  }

  // ── Sessions ────────────────────────────────────────────────────────────
  if (route === '/api/sessions' && method === 'GET') return s.sessions;

  if (route === '/api/sessions/create' && method === 'POST') {
    const resume = s.resumes.find((r) => r.id === body.resumeId) || s.resumes.find((r) => r.isPrimary);
    const session: InterviewSession = {
      id: makeId('sess'),
      userId: DEMO_UID,
      targetRole: body.targetRole || 'Software Engineer',
      targetCompany: body.targetCompany || 'Target Company',
      resumeId: resume?.id,
      resumeName: resume?.fileName,
      status: 'ready',
      startedAt: now(),
      totalDurationSeconds: 0,
      creditsDeducted: 0,
      questionsCount: 0,
      mode: body.mode === 'meeting' ? 'meeting' : 'interview',
      instructions: String(body.instructions || '').slice(0, 20000) || undefined,
      language: body.language || 'en-US',
      // Create-session wizard preferences (ParakeetAI parity)
      answerStyle: ['star', 'concise', 'technical', 'step_by_step', 'bullets', 'full_script'].includes(
        body.answerStyle
      )
        ? body.answerStyle
        : 'star',
      autoAnswer: typeof body.autoAnswer === 'boolean' ? body.autoAnswer : true,
      saveTranscript: typeof body.saveTranscript === 'boolean' ? body.saveTranscript : true,
      model: typeof body.model === 'string' && body.model ? body.model.slice(0, 60) : undefined,
    };
    s.sessions = [session, ...s.sessions];
    save();
    return session;
  }

  const statusMatch = route.match(/^\/api\/sessions\/([^/]+)\/status$/);
  if (statusMatch && method === 'POST') {
    const session = requireSession(statusMatch[1]);
    session.status = (body.status as InterviewSession['status']) || session.status;
    const delta = Number(body.durationDelta) || 0;
    if (delta > 0) session.totalDurationSeconds += delta;
    if (session.status === 'completed') session.endedAt = now();
    save();
    // Demo never charges credits, so a visitor can never hit a dead end.
    return { ...session, creditsCharged: 0, insufficientCredits: false, balanceAfter: s.wallet.balanceCredits };
  }

  const dataMatch = route.match(/^\/api\/sessions\/([^/]+)\/data$/);
  if (dataMatch) {
    const session = requireSession(dataMatch[1]);
    return {
      session,
      transcripts: s.transcripts[session.id] || [],
      answers: s.answers[session.id] || [],
      notes: s.notes[session.id],
    };
  }

  const transcriptMatch = route.match(/^\/api\/sessions\/([^/]+)\/transcript$/);
  if (transcriptMatch && method === 'POST') {
    const sessionId = transcriptMatch[1];
    const session = requireSession(sessionId);
    if (!body.text) throw new Error('Text required');
    const line: TranscriptLine = {
      id: makeId('line'),
      sessionId,
      speaker: body.speaker === 'candidate' ? 'candidate' : 'interviewer',
      text: String(body.text),
      isQuestion: body.speaker !== 'candidate' && /\?\s*$/.test(String(body.text)),
      confidence: 0.97,
      category: categoryFor(String(body.text)),
      timestamp: now(),
    };
    // "Save transcript" off = returned for the live view, never persisted.
    if (session.saveTranscript !== false) {
      s.transcripts[sessionId] = [...(s.transcripts[sessionId] || []), line];
      save();
    }
    return line;
  }

  const answerMatch = route.match(/^\/api\/sessions\/([^/]+)\/generate-answer$/);
  if (answerMatch && method === 'POST') {
    const sessionId = answerMatch[1];
    const session = requireSession(sessionId);
    const style: AnswerStyle = ['star', 'concise', 'technical', 'step_by_step', 'bullets', 'full_script'].includes(
      body.answerStyle
    )
      ? body.answerStyle
      : 'star';
    const questionText = String(body.questionText || 'Tell me about yourself');
    const composed = composeAnswer(questionText, style, session.targetRole);
    const answer: SessionAnswer = {
      id: makeId('ans'),
      sessionId,
      questionText,
      category: categoryFor(questionText),
      answerText: composed.text,
      answerStyle: style,
      starBreakdown: composed.star,
      groundingSources: ['Demo knowledge base (local)'],
      confidenceScore: 0.93,
      saved: false,
      createdAt: now(),
    };
    s.answers[sessionId] = [...(s.answers[sessionId] || []), answer];
    session.questionsCount = (session.questionsCount || 0) + 1;
    save();
    return answer;
  }

  // Screenshot / photo of a question -> answer (no network in demo mode)
  const imageAnswerMatch = route.match(/^\/api\/sessions\/([^/]+)\/answer-from-image$/);
  if (imageAnswerMatch && method === 'POST') {
    const sessionId = imageAnswerMatch[1];
    const session = requireSession(sessionId);
    const style: AnswerStyle = ['star', 'concise', 'technical', 'step_by_step', 'bullets', 'full_script'].includes(
      body.answerStyle
    )
      ? body.answerStyle
      : 'star';
    const composed = composeAnswer(
      'the interview question shown in the uploaded screenshot',
      style,
      session.targetRole
    );
    const answer: SessionAnswer = {
      id: makeId('ans'),
      sessionId,
      questionText: 'Question captured from screenshot / photo',
      category: 'technical',
      answerText: composed.text,
      answerStyle: style,
      starBreakdown: composed.star,
      groundingSources: ['Screenshot (read locally in demo mode)'],
      confidenceScore: 0.9,
      saved: false,
      createdAt: now(),
    };
    s.answers[sessionId] = [...(s.answers[sessionId] || []), answer];
    session.questionsCount = (session.questionsCount || 0) + 1;
    save();
    return answer;
  }

  // ── Mock Interview (AI interviewer) ───────────────────────────────────────
  if (route === '/api/mock/next-question' && method === 'POST') {
    const history: { question: string }[] = Array.isArray(body.history) ? body.history : [];
    const asked = new Set(history.map((h) => String(h.question)));
    const bank = [
      { question: 'Walk me through your background and the accomplishment you are most proud of.', category: 'behavioral' },
      { question: 'Tell me about a time you disagreed with a decision your team made. What did you do?', category: 'behavioral' },
      { question: 'Describe the hardest bug or incident you have debugged end to end.', category: 'technical' },
      { question: 'How would you design a rate limiter that works across a fleet of edge servers?', category: 'technical' },
      { question: 'You need to process 10 million events an hour with exactly-once semantics. Walk me through the design.', category: 'coding' },
      { question: 'What is the time complexity of your favourite data structure, and when would you not use it?', category: 'coding' },
      { question: 'Why are you interested in this role, and what would make you decline our offer?', category: 'behavioral' },
      { question: 'How do you decide between shipping fast and shipping safely when a deadline slips?', category: 'behavioral' },
      { question: 'Explain eventual consistency to a product manager, then to a staff engineer.', category: 'technical' },
      { question: 'What metrics would you instrument to know a feature launch succeeded?', category: 'technical' },
      { question: 'Tell me about feedback that stung. How did you respond to it?', category: 'behavioral' },
      { question: 'Design a URL shortener: storage, scale, and the trade-offs you would call out in review.', category: 'coding' },
    ];
    const round = history.length + 1;
    const unseen = bank.filter((b) => !asked.has(b.question));
    const pool = unseen.length > 0 ? unseen : bank;
    const pick = pool[(round * 5 + String(body.role || '').length) % pool.length];
    return { question: pick.question, category: pick.category, round };
  }

  if (route === '/api/mock/evaluate' && method === 'POST') {
    const answer = String(body.answer || '').trim();
    const question = String(body.question || '').trim();
    const role = String(body.role || 'the role');
    const wordCount = answer ? answer.split(/\s+/).length : 0;
    // Local heuristic score: reward structure and concrete detail, penalise brevity.
    const score = Math.max(35, Math.min(96, 45 + Math.min(wordCount, 180) * 0.3 + (answer.includes('because') ? 6 : 0)));
    return {
      score: Math.round(score),
      verdict:
        wordCount < 40
          ? 'Too thin — expand with context and a measurable result.'
          : score >= 80
            ? 'Strong answer: structured, specific, and credible.'
            : 'Solid base — add one quantified outcome to make it stick.',
      strengths: [
        'Directly addresses the question without rambling',
        'Clear structure the interviewer can follow',
        wordCount >= 80 ? 'Enough detail to be credible' : 'Concise enough to hold attention',
      ],
      improvements: [
        'Open with the context in one sentence before the detail',
        'Quantify the result (%, time saved, users affected)',
        'Close with what you learned or would do differently',
      ],
      improvedAnswer: `Situation and stakes first: in one sentence, set the scene for "${question.slice(0, 80)}". Then your actions, then the measurable result, then the lesson. As ${role}, anchor every claim in something you actually shipped.`,
      followUpHint: 'Interviewers often follow up with "what would you do differently?" — have that answer ready.',
    };
  }

  if (route === '/api/notes/generate' && method === 'POST') {
    const sessionId = String(body.sessionId || '');
    requireSession(sessionId);
    const notes = notesFor(sessionId);
    s.notes[sessionId] = notes;
    save();
    return notes;
  }

  // ── Coding sandbox ──────────────────────────────────────────────────────
  if (route === '/api/coding/analyze' && method === 'POST') {
    return {
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(1)',
      approach:
        'Single pass over the input while keeping the smallest element seen so far in a variable, then one comparison per element to produce the result. The idea is to buy constant memory by giving up the ability to revisit earlier elements - which is fine here because the input is scanned exactly once.',
      explanation:
        'This is the straightforward, interview-friendly solution: correct first, optimised second. If the input grew far beyond memory, the next step would be an external sort or a streaming variant, and I would say that trade-off out loud rather than silently changing the design.',
      bugsOrWarnings: ['No bounds check on an empty input - worth an explicit early return.'],
      suggestedSolution: `function solve(input) {\n  if (!input || input.length === 0) return [];\n  // single pass, constant extra memory\n  const result = [];\n  for (let i = 0; i < input.length; i++) {\n    result.push(input[i]);\n  }\n  return result;\n}`,
      testCases: [
        { input: '[2, 7, 11, 15], target = 9', expected: '[0, 1]' },
        { input: '[3, 2, 4], target = 6', expected: '[1, 2]' },
        { input: '[]', expected: '[]' },
      ],
    };
  }

  if (route === '/api/coding/execute' && method === 'POST') {
    const cases: any[] = Array.isArray(body.testCases) ? body.testCases : [];
    const results = cases.map((tc, i) => ({
      input: tc.input,
      expected: tc.expected,
      actual: tc.expected,
      passed: true,
      executionTimeMs: 6 + ((i * 7) % 19),
    }));
    return {
      language: body.language || 'javascript',
      allPassed: true,
      totalCases: results.length,
      passedCases: results.length,
      results,
      stdout: 'Tests finished successfully. Memory consumption: 14.2 MB (demo runner)',
    };
  }

  // ── Admin ───────────────────────────────────────────────────────────────
  if (route === '/api/admin/overview') {
    return {
      totalUsers: 1,
      activeSubscribers: s.subscription.status === 'active' ? 1 : 0,
      totalSessions: s.sessions.length,
      totalCreditsInCirculation: s.wallet.balanceCredits,
      activeAiProvider: s.adminSettings.activeAiProvider,
      defaultModel: s.adminSettings.defaultModel,
    };
  }

  if (route === '/api/admin/users') {
    return [
      {
        ...s.user,
        wallet: s.wallet,
        subscription: s.subscription,
        sessionsCount: s.sessions.length,
        devicesCount: s.devices.length,
      },
    ];
  }

  if (route === '/api/admin/adjust-credits' && method === 'POST') {
    const amount = Number(body.amount);
    if (!body.targetUserId || !Number.isFinite(amount)) throw new Error('targetUserId and numeric amount required');
    s.wallet.balanceCredits = Math.max(0, s.wallet.balanceCredits + amount);
    s.wallet.updatedAt = now();
    const tx: CreditTransaction = {
      id: makeId('tx'),
      userId: DEMO_UID,
      amount,
      type: 'admin_grant',
      balanceAfter: s.wallet.balanceCredits,
      description: body.reason || 'Admin adjustment (demo)',
      createdAt: now(),
    };
    s.transactions = [tx, ...s.transactions];
    save();
    return { success: true, wallet: s.wallet };
  }

  if (route === '/api/admin/audit-logs') return s.auditLogs;

  if (route === '/api/admin/settings') {
    if (method === 'POST') {
      s.adminSettings = { ...s.adminSettings, ...body, updatedAt: now() };
      save();
      return s.adminSettings;
    }
    return s.adminSettings;
  }

  // ── Invitation-only enrolment (demo mirror) ──────────────────────────────
  if (route === '/api/admin/enrolled-users') {
    if (method === 'GET') {
      return (s.adminSettings.enrolledEmails || []).map((email: string) => ({
        email,
        role: s.user.email === email ? (s.user.role as UserRole) : 'user',
        enrolledAt: s.user.createdAt,
        provisioned: s.user.email === email,
      }));
    }
    if (method === 'POST') {
      const email = String(body?.email || '').toLowerCase();
      if (!email || !email.includes('@')) throw new Error('A valid email is required.');
      const enrolled = s.adminSettings.enrolledEmails || [];
      if (enrolled.includes(email)) throw new Error('This email is already enrolled.');
      if (enrolled.length >= 2) throw new Error('Enrolment cap reached: this platform accepts only two enrolled accounts.');
      s.adminSettings.enrolledEmails = [...enrolled, email];
      save();
      return { enrolled: s.adminSettings.enrolledEmails, email };
    }
    if (method === 'DELETE') {
      throw new Error('Use /api/admin/enrolled-users/:email');
    }
  }

  if (route.match(/^\/api\/admin\/enrolled-users\/([^/]+)$/) && method === 'DELETE') {
    const email = route.match(/^\/api\/admin\/enrolled-users\/([^/]+)$/)![1].toLowerCase();
    const enrolled = s.adminSettings.enrolledEmails || [];
    if (!enrolled.includes(email)) throw new Error('This email is not enrolled.');
    if (enrolled.length <= 1) throw new Error('Cannot unenroll the last enrolled account.');
    s.adminSettings.enrolledEmails = enrolled.filter((e: string) => e !== email);
    save();
    return { enrolled: s.adminSettings.enrolledEmails, removed: email };
  }

  // Unrecognised route: lists render as empty, everything else as an object.
  console.warn(`[demo] unhandled route ${method} ${route}`);
  return method === 'GET' ? [] : {};
}
