/**
 * Headless smoke test for the in-browser demo backend.
 * Runs src/lib/demoApi.ts under Node with a localStorage shim and asserts
 * the response shapes the UI depends on.
 */
import assert from 'node:assert';

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

const { demoFetch } = await import('../src/lib/demoApi');

const get = (path: string) => demoFetch(path, { method: 'GET' });
const post = (path: string, body: unknown) =>
  demoFetch(path, { method: 'POST', body: JSON.stringify(body ?? {}) });

// ── /api/me ────────────────────────────────────────────────────────────────
const me = await get('/api/me');
assert.ok(me.user?.uid, 'me.user.uid');
assert.ok(Array.isArray(me.devices), 'me.devices[]');
assert.ok(typeof me.wallet?.balanceCredits === 'number', 'me.wallet.balanceCredits');
assert.ok(me.subscription?.planTier, 'me.subscription.planTier');
assert.ok(Array.isArray(me.resumes) && me.resumes.length > 0, 'seeded resumes');
assert.ok(Array.isArray(me.documents) && me.documents.length > 0, 'seeded documents');
assert.ok(Array.isArray(me.sessions) && me.sessions.length > 0, 'seeded sessions');
assert.equal(me.user.role, 'super_admin', 'demo user may open admin');

// ── devices ────────────────────────────────────────────────────────────────
const dev = await post('/api/auth/register-device', { deviceType: 'desktop', deviceName: 'CI probe' });
assert.equal(dev.device.deviceType, 'desktop');
assert.equal(dev.revokedOldDevice, null, 'demo never reports a revocation');

// ── sessions lifecycle ─────────────────────────────────────────────────────
const session = await post('/api/sessions/create', {
  targetRole: 'Product Manager',
  targetCompany: 'Acme Corp',
  resumeId: me.resumes[0].id,
  mode: 'meeting',
  instructions: 'Keep answers under 60 seconds',
  language: 'es-ES',
});
assert.equal(session.status, 'ready');
assert.equal(session.targetRole, 'Product Manager');
assert.equal(session.mode, 'meeting', 'session mode persisted');
assert.equal(session.instructions, 'Keep answers under 60 seconds', 'instructions persisted');
assert.equal(session.language, 'es-ES', 'language persisted');

const line = await post(`/api/sessions/${session.id}/transcript`, {
  speaker: 'interviewer',
  text: 'Tell me about a time you shipped under a tight deadline?',
});
assert.equal(line.speaker, 'interviewer');
assert.equal(line.isQuestion, true, 'question detection');

const answer = await post(`/api/sessions/${session.id}/generate-answer`, {
  questionText: 'Tell me about a time you shipped under a tight deadline?',
  answerStyle: 'star',
});
assert.ok(answer.answerText.length > 100, 'answer text');
assert.ok(answer.starBreakdown?.situation, 'STAR breakdown present');
assert.equal(answer.answerStyle, 'star');

const concise = await post(`/api/sessions/${session.id}/generate-answer`, {
  questionText: 'How do you handle disagreement on a team?',
  answerStyle: 'concise',
});
assert.equal(concise.answerStyle, 'concise');

// ParakeetAI parity: bullets + full_script answer formats
const bullets = await post(`/api/sessions/${session.id}/generate-answer`, {
  questionText: 'What is your biggest strength?',
  answerStyle: 'bullets',
});
assert.equal(bullets.answerStyle, 'bullets');
assert.ok(bullets.answerText.includes('•'), 'bullets style uses bullet characters');

const script = await post(`/api/sessions/${session.id}/generate-answer`, {
  questionText: 'Tell me about yourself.',
  answerStyle: 'full_script',
});
assert.equal(script.answerStyle, 'full_script');
assert.ok(script.answerText.length > 100, 'full script is substantive');

// Screenshot / photo -> answer
const imageAnswer = await post(`/api/sessions/${session.id}/answer-from-image`, {
  imageBase64: 'a'.repeat(200),
  mimeType: 'image/jpeg',
  answerStyle: 'technical',
});
assert.ok(imageAnswer.answerText.length > 50, 'image answer text');
assert.equal(imageAnswer.questionText.includes('screenshot'), true, 'image question text');
assert.ok(
  imageAnswer.groundingSources.some((g: string) => g.includes('Screenshot')),
  'image grounding source'
);

const status = await post(`/api/sessions/${session.id}/status`, {
  status: 'active',
  durationDelta: 60,
});
assert.equal(status.creditsCharged, 0, 'demo never charges credits');
assert.equal(status.insufficientCredits, false);
assert.equal(status.totalDurationSeconds, 60);

const data = await get(`/api/sessions/${session.id}/data`);
assert.equal(data.transcripts.length, 1);
assert.equal(data.answers.length, 5, 'star + concise + bullets + full_script + image answers');

// ── notes (route: /api/notes/generate) ─────────────────────────────────────
const notes = await post('/api/notes/generate', { sessionId: session.id });
assert.ok(notes.executiveSummary?.length > 20, 'executiveSummary');
assert.ok(Array.isArray(notes.actionItems) && notes.actionItems.length > 0, 'actionItems');
assert.ok(notes.thankYouEmailDraft?.includes('Subject:'), 'thank-you draft');

// ── mock interview (AI interviewer) ────────────────────────────────────────
const q1 = await post('/api/mock/next-question', { role: 'Backend Engineer', company: 'Acme', history: [] });
assert.ok(q1.question?.length > 20, 'mock question text');
assert.ok(q1.category, 'mock question category');
assert.equal(q1.round, 1, 'first round');

const q2 = await post('/api/mock/next-question', {
  role: 'Backend Engineer',
  history: [{ question: q1.question }],
});
assert.notEqual(q2.question, q1.question, 'no duplicate questions');

const evaluation = await post('/api/mock/evaluate', {
  question: q1.question,
  answer:
    'In my last role I owned the migration end to end. I wrote the plan down, reviewed the riskiest part first, and checked in at each milestone. We shipped two weeks early and cut recurring effort by half.',
  role: 'Backend Engineer',
  company: 'Acme',
});
assert.ok(evaluation.score >= 0 && evaluation.score <= 100, 'score in range');
assert.ok(Array.isArray(evaluation.strengths) && evaluation.strengths.length > 0, 'strengths');
assert.ok(Array.isArray(evaluation.improvements) && evaluation.improvements.length > 0, 'improvements');
assert.ok(evaluation.improvedAnswer?.length > 30, 'model answer');
assert.ok(evaluation.followUpHint?.length > 10, 'follow-up hint');

// ── wallet & billing ───────────────────────────────────────────────────────
const before = (await get('/api/wallet')).balanceCredits;
const purchase = await post('/api/wallet/purchase', { creditsAmount: 250, packName: 'Starter Pack' });
assert.equal(purchase.success, true);
assert.equal(purchase.wallet.balanceCredits, before + 250);

const txs = await get('/api/wallet/transactions');
assert.ok(txs.some((t: any) => t.amount === 250), 'purchase transaction recorded');

const plan = await post('/api/subscriptions/update', { planTier: 'executive' });
assert.equal(plan.subscription.planTier, 'executive');

// ── resumes & documents ────────────────────────────────────────────────────
const resume = await post('/api/resumes/upload', {
  fileName: 'probe_resume.txt',
  textContent: 'Probe Person - Engineer',
  fileType: 'txt',
});
assert.ok(resume.id?.startsWith('resume_'), 'resume id');
assert.equal((await post(`/api/resumes/${resume.id}/primary`, {})).success, true);
assert.equal((await demoFetch(`/api/resumes/${resume.id}`, { method: 'DELETE' })).success, true);

const doc = await post('/api/documents/upload', {
  title: 'Probe doc',
  category: 'job_description',
  content: 'x'.repeat(1200),
});
assert.equal(doc.chunkCount, 3, 'chunking');
assert.equal((await demoFetch(`/api/documents/${doc.id}`, { method: 'DELETE' })).success, true);

// ── coding sandbox ─────────────────────────────────────────────────────────
const analysis = await post('/api/coding/analyze', {
  title: 'Two Sum',
  description: 'Find indices',
  language: 'javascript',
  userCode: 'function twoSum() {}',
});
for (const key of ['timeComplexity', 'spaceComplexity', 'approach', 'suggestedSolution', 'testCases']) {
  assert.ok(analysis[key], `analysis.${key}`);
}

const run = await post('/api/coding/execute', {
  language: 'javascript',
  testCases: [{ input: '1', expected: '1' }, { input: '2', expected: '2' }],
});
assert.equal(run.allPassed, true);
assert.equal(run.totalCases, 2);
assert.equal(run.passedCases, 2);

// ── admin ──────────────────────────────────────────────────────────────────
const overview = await get('/api/admin/overview');
for (const key of ['totalUsers', 'activeSubscribers', 'totalSessions', 'totalCreditsInCirculation', 'activeAiProvider', 'defaultModel']) {
  assert.ok(key in overview, `overview.${key}`);
}

const users = await get('/api/admin/users');
assert.equal(users.length, 1);
assert.ok(users[0].wallet && users[0].subscription, 'admin users carry wallet+subscription');

const adjusted = await post('/api/admin/adjust-credits', {
  targetUserId: me.user.uid,
  amount: 100,
  reason: 'smoke test',
});
assert.equal(adjusted.success, true);

const settings = await get('/api/admin/settings');
assert.equal(settings.activeAiProvider, 'google_gemini');
const saved = await post('/api/admin/settings', { creditsPerMinute: 9 });
assert.equal(saved.creditsPerMinute, 9);

const audits = await get('/api/admin/audit-logs');
assert.ok(Array.isArray(audits) && audits.length > 0, 'audit logs');

// ── persistence ────────────────────────────────────────────────────────────
assert.ok(store.has('askmeai.demo.v1'), 'state persisted to localStorage');

// ── unknown routes degrade gracefully ──────────────────────────────────────
assert.deepEqual(await get('/api/whatever'), [], 'unknown GET -> []');
assert.deepEqual(await post('/api/whatever', {}), {}, 'unknown POST -> {}');

console.log('demoApi smoke test: all assertions passed');
