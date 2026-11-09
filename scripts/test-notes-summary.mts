/**
 * End-to-end proof that meeting notes + summarization work: runs the exact
 * prompt used by POST /api/notes/generate against a realistic interview
 * transcript through the real AI pipeline (3-key Gemini rotation, with the
 * backup provider as failover), then validates the JSON synthesis.
 *
 *   npm run test:notes
 */
import '../src/server/env';
import { gemini, PRIMARY_MODEL } from '../src/server/gemini';

const session = {
  targetRole: 'Senior Product Manager',
  targetCompany: 'Stripe',
  totalDurationSeconds: 2700,
};

// A realistic captured meeting transcript (what Live Studio stores).
const transcripts = [
  {
    speaker: 'INTERVIEWER',
    timestamp: '00:00:12',
    text: 'Thanks for joining. To start off, tell me about a product you shipped end to end.',
  },
  {
    speaker: 'CANDIDATE',
    timestamp: '00:00:31',
    text: 'At Acme I led the billing notifications rewrite. We had a 38% support-ticket rate from failed payment alerts, so I prioritised the problem with support data first, then shipped an event-driven pipeline over six weeks.',
  },
  {
    speaker: 'INTERVIEWER',
    timestamp: '00:03:47',
    text: 'How did you handle disagreement with engineering on scope?',
  },
  {
    speaker: 'CANDIDATE',
    timestamp: '00:04:02',
    text: 'I proposed cutting the analytics dashboard from v1 and instrumenting it instead, so we could decide with data. Engineering agreed, we shipped two weeks early, and the dashboard came in v1.2.',
  },
  {
    speaker: 'INTERVIEWER',
    timestamp: '00:28:10',
    text: 'Last question: what would your first ninety days look like here?',
  },
  {
    speaker: 'CANDIDATE',
    timestamp: '00:28:25',
    text: 'First thirty days understanding the activation funnel and meeting the teams; days thirty to sixty picking one high-leverage friction point and shipping a measured fix; sixty to ninety presenting the roadmap with the metrics behind it.',
  },
];

const answers = [
  {
    questionText: 'Tell me about a product you shipped end to end.',
    answerText:
      'STAR — Situation: 38% of support tickets came from failed payment alerts. Task: own the rewrite end to end. Action: prioritised with support data, built an event-driven pipeline, shipped in six weeks. Result: ticket rate dropped to 9% and the team adopted the pattern for two other flows.',
  },
];

// ── Identical prompt to server.ts POST /api/notes/generate ─────────────────
const conversationTranscript = transcripts
  .map((t) => `${t.speaker.toUpperCase()} (${t.timestamp}): ${t.text}`)
  .join('\n');

const prompt = `You are an executive interview debrief coach. Summarize the following completed interview session:
TARGET ROLE: ${session.targetRole}
TARGET COMPANY: ${session.targetCompany}
DURATION: ${Math.round(session.totalDurationSeconds / 60)} minutes

TRANSCRIPTS:
${conversationTranscript || 'No transcripts recorded.'}

ANSWERS RECORDED:
${answers.map((a) => `Q: ${a.questionText}\nA: ${a.answerText}`).join('\n\n')}

Generate a comprehensive post-interview synthesis in JSON format:
{
  "executiveSummary": "Concise 3-sentence summary of overall interview performance and flow",
  "keyTopicsDiscussed": ["Topic 1", "Topic 2", "Topic 3"],
  "actionItems": ["Action 1", "Action 2"],
  "candidateStrengths": ["Strength 1", "Strength 2"],
  "areasForImprovement": ["Area 1", "Area 2"],
  "thankYouEmailDraft": "Complete, polished thank-you email for the hiring manager"
}`;

console.log(`[test:notes] model: ${PRIMARY_MODEL} | gemini configured: ${gemini.configured}`);

if (!gemini.configured) {
  console.error('FAIL: no Gemini key configured (GEMINI_API_KEYS)');
  process.exit(1);
}

const started = Date.now();
const result = await gemini.generate(
  { model: PRIMARY_MODEL, contents: prompt, config: { responseMimeType: 'application/json' } },
  30000
);
const elapsed = Date.now() - started;

if (!result || !result.text) {
  console.error('FAIL: model returned no text', result);
  process.exit(1);
}

let parsed: any;
try {
  parsed = JSON.parse(result.text);
} catch (err) {
  console.error('FAIL: response is not valid JSON:', result.text.slice(0, 400));
  process.exit(1);
}

const required = [
  'executiveSummary',
  'keyTopicsDiscussed',
  'actionItems',
  'candidateStrengths',
  'areasForImprovement',
  'thankYouEmailDraft',
];
const missing = required.filter((k) => !(k in parsed));
if (missing.length) {
  console.error('FAIL: missing fields:', missing.join(', '));
  process.exit(1);
}
if (!Array.isArray(parsed.keyTopicsDiscussed) || parsed.keyTopicsDiscussed.length === 0) {
  console.error('FAIL: keyTopicsDiscussed must be a non-empty array');
  process.exit(1);
}
if (!parsed.executiveSummary || parsed.executiveSummary.length < 40) {
  console.error('FAIL: executiveSummary too short');
  process.exit(1);
}
if (!parsed.thankYouEmailDraft || !/dear|hi|hello|thank/i.test(parsed.thankYouEmailDraft)) {
  console.error('FAIL: thank-you email draft missing');
  process.exit(1);
}

console.log(`\nOK: summarised ${transcripts.length} transcript lines + ${answers.length} answer(s) in ${elapsed}ms\n`);
console.log('── Executive summary ─────────────────────────────');
console.log(parsed.executiveSummary);
console.log('\n── Key topics ────────────────────────────────────');
console.log(parsed.keyTopicsDiscussed.map((t: string) => `  • ${t}`).join('\n'));
console.log('\n── Action items ──────────────────────────────────');
console.log(parsed.actionItems.map((t: string) => `  • ${t}`).join('\n'));
console.log('\n── Strengths ─────────────────────────────────────');
console.log(parsed.candidateStrengths.map((t: string) => `  • ${t}`).join('\n'));
console.log('\n── Areas for improvement ─────────────────────────');
console.log(parsed.areasForImprovement.map((t: string) => `  • ${t}`).join('\n'));
console.log('\n── Thank-you email (first 300 chars) ─────────────');
console.log(parsed.thankYouEmailDraft.slice(0, 300) + '…');
console.log('\ntest:notes: all assertions passed');
