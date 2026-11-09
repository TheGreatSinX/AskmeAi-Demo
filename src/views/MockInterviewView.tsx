import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import {
  Bot,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Square,
  Send,
  SkipForward,
  Trophy,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Briefcase,
} from 'lucide-react';

interface Evaluation {
  question: string;
  answer: string;
  score: number;
  verdict: string;
  strengths: string[];
  improvements: string[];
  improvedAnswer: string;
  followUpHint: string;
}

const scoreColor = (score: number) =>
  score >= 80 ? 'text-emerald-400 border-emerald-500/50' : score >= 65 ? 'text-amber-400 border-amber-500/50' : 'text-rose-400 border-rose-500/50';

export const MockInterviewView: React.FC = () => {
  const { showToast } = useApp();

  // ── Setup ────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<'setup' | 'live' | 'done'>('setup');
  const [role, setRole] = useState('Staff Software Engineer');
  const [company, setCompany] = useState('Stripe');
  const [difficulty, setDifficulty] = useState('medium');
  const [targetRounds, setTargetRounds] = useState(5);

  // ── Live mock ────────────────────────────────────────────────────────────
  const [question, setQuestion] = useState<{ question: string; category: string; round: number } | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

  const recognitionRef = useRef<any>(null);

  // ── Speech: the interviewer actually talks (speechSynthesis) ─────────────
  const speak = (text: string) => {
    if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') {
      showToast('Voice output is not supported in this browser', 'info');
      return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.03;
    speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
      try {
        recognitionRef.current?.stop();
      } catch {
        /* not started */
      }
    };
  }, []);

  // ── Speech: one-shot dictation of the answer ─────────────────────────────
  const startDictation = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      showToast('Speech recognition is not supported in this browser — type your answer instead', 'error');
      return;
    }
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* noop */
      }
      setIsListening(false);
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.trim();
      if (transcript) {
        setAnswerText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        showToast('Answer dictated', 'success');
      }
    };
    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech') console.warn('Dictation notice:', e.error);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
      showToast('Listening — speak your answer…', 'info');
    } catch {
      setIsListening(false);
    }
  };

  // ── Flow ─────────────────────────────────────────────────────────────────
  const fetchNextQuestion = async (history: { question: string; score?: number }[]) => {
    setIsFetching(true);
    try {
      const next = await api.mockNextQuestion({ role, company, difficulty, history });
      setQuestion(next);
      setAnswerText('');
      if (voiceOn) speak(next.question);
    } catch (e: any) {
      showToast(e.message || 'Could not fetch a question', 'error');
    } finally {
      setIsFetching(false);
    }
  };

  const startMock = async () => {
    if (!role.trim()) {
      showToast('Set a target role first', 'error');
      return;
    }
    setEvaluations([]);
    setPhase('live');
    await fetchNextQuestion([]);
  };

  const submitAnswer = async () => {
    if (!question) return;
    const answer = answerText.trim();
    if (answer.split(/\s+/).length < 8) {
      showToast('Give a fuller answer first (at least a couple of sentences)', 'error');
      return;
    }
    setIsEvaluating(true);
    try {
      const evaluation = await api.mockEvaluate({ question: question.question, answer, role, company });
      setEvaluations((prev) => [
        { question: question.question, answer, ...evaluation },
        ...prev,
      ]);
      const history = [{ question: question.question, score: evaluation.score }, ...evaluations.map((e) => ({ question: e.question, score: e.score }))];
      if (evaluations.length + 1 >= targetRounds) {
        setPhase('done');
        if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
      } else {
        await fetchNextQuestion(history);
      }
    } catch (e: any) {
      showToast(e.message || 'Evaluation failed', 'error');
    } finally {
      setIsEvaluating(false);
    }
  };

  const skipQuestion = async () => {
    if (!question) return;
    await fetchNextQuestion([{ question: question.question }, ...evaluations.map((e) => ({ question: e.question }))]);
  };

  const endMock = () => {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    try {
      recognitionRef.current?.stop();
    } catch {
      /* noop */
    }
    setIsListening(false);
    setPhase(evaluations.length > 0 ? 'done' : 'setup');
  };

  const restart = () => {
    setPhase('setup');
    setQuestion(null);
    setEvaluations([]);
    setAnswerText('');
    setExpanded(null);
  };

  const avgScore =
    evaluations.length > 0
      ? Math.round(evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length)
      : 0;

  // ── Setup screen ─────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-12">
        <div className="text-center space-y-3 pt-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-purple-500/20 border border-purple-500/40 mx-auto">
            <Bot className="h-7 w-7 text-purple-300" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Mock Interview</h1>
          <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            An AI interviewer asks the questions out loud, listens to your spoken or typed answer, and scores it
            with specific feedback — then hands you a tightened model answer.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 lg:p-7  space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-emerald-400" /> Target Role
              </label>
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" /> Target Company
              </label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Questions</label>
              <select
                value={targetRounds}
                onChange={(e) => setTargetRounds(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value={3}>3 questions (quick)</option>
                <option value={5}>5 questions (standard)</option>
                <option value={10}>10 questions (full loop)</option>
              </select>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 flex items-center gap-3">
            <Volume2 className="h-4 w-4 text-purple-400 flex-shrink-0" />
            <span>
              The interviewer speaks each question. Answer out loud with the mic, or type — you get a score,
              strengths, improvements, a model answer, and the likely follow-up after every round.
            </span>
          </div>

          <button
            onClick={startMock}
            disabled={isFetching}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-emerald-400 text-[#052e1c] hover:bg-emerald-300 transition-all disabled:opacity-50"
          >
            {isFetching ? 'Preparing your interviewer…' : (<><Play className="h-4 w-4 fill-slate-950" /> Start Mock Interview</>)}
          </button>
        </div>
      </div>
    );
  }

  // ── Done: score report ───────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-8 text-center space-y-4 ">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-amber-500/20 border border-amber-500/40 mx-auto">
            <Trophy className="h-7 w-7 text-amber-300" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mock Complete</span>
            <div className={`text-5xl font-extrabold font-mono mt-1 ${scoreColor(avgScore).split(' ')[0]}`}>
              {avgScore}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              average across {evaluations.length} question{evaluations.length === 1 ? '' : 's'} for {role} @ {company}
            </p>
          </div>
          <p className="text-sm text-slate-300 max-w-xl mx-auto">
            {avgScore >= 80
              ? 'Interview-ready. Your answers are structured, specific, and credible — keep the quantified results coming.'
              : avgScore >= 65
                ? 'Solid showing. Tighten the opening of each answer and quantify one more result per story.'
                : 'Good start. Lead with context in one sentence, then actions, then a measurable result — and rehearse it out loud.'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              onClick={startMock}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-purple-500 hover:bg-purple-400 text-slate-950 transition-colors"
            >
              Run Another Mock
            </button>
            <button
              onClick={restart}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              Change Settings
            </button>
          </div>
        </div>

        {evaluations.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-white">Question-by-question breakdown</h2>
            {evaluations.map((e, i) => (
              <EvaluationCard
                key={i}
                evaluation={e}
                index={i}
                expanded={expanded === i}
                onToggle={() => setExpanded(expanded === i ? null : i)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Live mock ────────────────────────────────────────────────────────────
  const round = question?.round || evaluations.length + 1;

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg border border-slate-800 bg-slate-900/80 ">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 border border-purple-500/40">
            <Bot className="h-5 w-5 text-purple-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white">AI Interviewer</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                {role} @ {company}
              </span>
            </div>
            <span className="text-xs text-slate-400">
              Round {round} of {targetRounds} · {difficulty} · {evaluations.length} scored
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setVoiceOn(!voiceOn);
              if (voiceOn && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
            }}
            title={voiceOn ? 'Voice on — questions are spoken' : 'Voice off — questions are text only'}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              voiceOn
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-200'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            {voiceOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            Voice {voiceOn ? 'On' : 'Off'}
          </button>
          <button
            onClick={endMock}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors"
          >
            <Square className="h-3 w-3 fill-rose-300" /> End Mock
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Question + answer */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5  space-y-4">
          {question ? (
            <>
              <div className="p-4 rounded-lg bg-slate-950/80 border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-purple-300 uppercase tracking-wider">
                    Question {round} · {question.category}
                  </span>
                  <button
                    onClick={() => speak(question.question)}
                    title="Replay question out loud"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-sm font-semibold text-white leading-relaxed">{question.question}</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                  <span>Your answer</span>
                  <span className="text-[10px] text-slate-500">{answerText.trim().split(/\s+/).filter(Boolean).length} words</span>
                </label>
                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  rows={8}
                  placeholder="Type your answer, or hit the mic and speak it…"
                  className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors resize-y leading-relaxed"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={startDictation}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    isListening
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {isListening ? 'Stop' : 'Speak Answer'}
                </button>
                <button
                  onClick={submitAnswer}
                  disabled={isEvaluating || isFetching}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-purple-500 hover:bg-purple-400 text-slate-950 transition-colors disabled:opacity-50"
                >
                  {isEvaluating ? (
                    <span className="h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  {isEvaluating ? 'Scoring…' : 'Submit & Score'}
                </button>
                <button
                  onClick={skipQuestion}
                  disabled={isFetching || isEvaluating}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50"
                >
                  <SkipForward className="h-3.5 w-3.5" /> Skip
                </button>
              </div>
            </>
          ) : (
            <div className="py-24 text-center space-y-3">
              <div className="h-10 w-10 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-400">
                {isFetching ? 'Your interviewer is thinking of the next question…' : 'Preparing…'}
              </p>
            </div>
          )}
        </div>

        {/* Evaluation feed */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5  space-y-4 lg:max-h-[680px] lg:overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-white">Coaching Feedback</span>
            {evaluations.length > 0 && (
              <span className="text-[11px] font-mono text-slate-400">
                avg {avgScore}
              </span>
            )}
          </div>

          {evaluations.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <CheckCircle2 className="h-8 w-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Answer the question on the left and submit it — scores, strengths, and improvements land here.
              </p>
            </div>
          ) : (
            evaluations.map((e, i) => (
              <EvaluationCard
                key={i}
                evaluation={e}
                index={i}
                expanded={expanded === i}
                onToggle={() => setExpanded(expanded === i ? null : i)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const EvaluationCard: React.FC<{
  evaluation: Evaluation;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}> = ({ evaluation, index, expanded, onToggle }) => (
  <div className="rounded-lg border border-slate-800 bg-slate-950/60 overflow-hidden">
    <div className="p-4 flex items-start gap-3">
      <div
        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border-2 bg-slate-900 font-mono text-sm font-extrabold ${scoreColor(
          evaluation.score
        )}`}
      >
        {evaluation.score}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white leading-snug line-clamp-2">{evaluation.question}</p>
        <p className="text-[11px] text-slate-400 mt-1">{evaluation.verdict}</p>
      </div>
      <button
        onClick={onToggle}
        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors flex-shrink-0"
        title={expanded ? 'Collapse' : 'Expand feedback'}
      >
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
    </div>

    {expanded && (
      <div className="px-4 pb-4 space-y-3 border-t border-slate-800 pt-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Strengths
            </span>
            <ul className="space-y-1">
              {evaluation.strengths.map((s, i) => (
                <li key={i} className="text-[11px] text-slate-300 leading-snug flex gap-1.5">
                  <span className="text-emerald-400">•</span> {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Improve
            </span>
            <ul className="space-y-1">
              {evaluation.improvements.map((s, i) => (
                <li key={i} className="text-[11px] text-slate-300 leading-snug flex gap-1.5">
                  <span className="text-amber-400">•</span> {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {evaluation.improvedAnswer && (
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] font-extrabold text-purple-300 uppercase tracking-wider">Model Answer</span>
            <p className="text-[11px] text-slate-200 leading-relaxed">{evaluation.improvedAnswer}</p>
          </div>
        )}

        {evaluation.followUpHint && (
          <p className="text-[11px] text-cyan-300/90 flex gap-1.5">
            <Sparkles className="h-3 w-3 flex-shrink-0 mt-0.5" /> {evaluation.followUpHint}
          </p>
        )}
      </div>
    )}
  </div>
);
