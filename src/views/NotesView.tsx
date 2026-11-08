import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import {
  ClipboardList,
  Calendar,
  Sparkles,
  Download,
  Copy,
  Check,
  Mail,
  Award,
  AlertCircle,
  FileText,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { InterviewSession, SessionNotes, SessionAnswer, TranscriptLine } from '../types';

export const NotesView: React.FC = () => {
  const { sessions, showToast } = useApp();
  const [selectedSessionId, setSelectedSessionId] = useState<string>(sessions[0]?.id || '');
  const [sessionData, setSessionData] = useState<{
    session: InterviewSession;
    transcripts: TranscriptLine[];
    answers: SessionAnswer[];
    notes?: SessionNotes;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (selectedSessionId) {
      loadSessionDetails(selectedSessionId);
    }
  }, [selectedSessionId]);

  const loadSessionDetails = async (id: string) => {
    setIsLoading(true);
    try {
      const data = await api.getSessionData(id);
      setSessionData(data);
    } catch (e: any) {
      showToast('Could not load session notes', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (!sessionData?.notes) return;
    const n = sessionData.notes;
    const s = sessionData.session;
    const md = `# Interview Debrief: ${s.targetCompany} - ${s.targetRole}
**Date:** ${new Date(s.startedAt).toLocaleDateString()} | **Duration:** ${Math.round(s.totalDurationSeconds / 60)} mins

## Executive Summary
${n.executiveSummary}

## Key Topics Discussed
${n.keyTopicsDiscussed.map((t) => `- ${t}`).join('\n')}

## Strengths
${n.candidateStrengths.map((st) => `- ${st}`).join('\n')}

## Areas for Improvement
${n.areasForImprovement.map((a) => `- ${a}`).join('\n')}

## Thank-You Email Draft
\`\`\`
${n.thankYouEmailDraft}
\`\`\`
`;
    navigator.clipboard.writeText(md);
    setCopied(true);
    showToast('Copied full markdown report to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl border border-slate-800 bg-slate-900/80 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">AI Notes & Debrief Summaries</h1>
            <p className="text-xs text-slate-400">
              Executive takeaways, candidate feedback, and interview follow-up emails
            </p>
          </div>
        </div>

        {sessionData?.notes && (
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-md"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-slate-950" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Markdown'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 2-Column Split: Session List vs Report */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Past Sessions (4 cols) */}
        <div className="lg:col-span-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Interview Sessions ({sessions.length})
          </h2>

          <div className="space-y-2">
            {sessions.map((s) => {
              const isSelected = selectedSessionId === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSessionId(s.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-purple-500/50 bg-purple-950/20 shadow-sm'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{s.targetCompany}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(s.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                    <span>{s.targetRole}</span>
                    <span className="font-mono">{Math.round(s.totalDurationSeconds / 60)} mins</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Synthesis Report (8 cols) */}
        <div className="lg:col-span-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg space-y-5">
          {isLoading ? (
            <div className="py-24 text-center space-y-3">
              <div className="h-10 w-10 rounded-full border-2 border-purple-400 border-t-transparent animate-spin mx-auto"></div>
              <h3 className="text-sm font-bold text-white">Loading Session Synthesis...</h3>
            </div>
          ) : sessionData ? (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Session Meta */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {sessionData.session.targetCompany} Debrief
                  </h2>
                  <p className="text-xs text-purple-300 font-medium">
                    {sessionData.session.targetRole} •{' '}
                    {Math.round(sessionData.session.totalDurationSeconds / 60)} minutes session
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-400 font-mono">
                    {sessionData.session.overallScore || 94}%
                  </span>
                  <span className="text-[10px] text-slate-400 block">Overall Performance</span>
                </div>
              </div>

              {sessionData.notes ? (
                <>
                  {/* Executive Summary */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block">
                      Executive Summary
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {sessionData.notes.executiveSummary}
                    </p>
                  </div>

                  {/* Strengths & Improvements 2-col */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Strengths */}
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/20 space-y-2">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <Award className="h-4 w-4" /> Demonstrated Strengths:
                      </span>
                      <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                        {sessionData.notes.candidateStrengths.map((st, i) => (
                          <li key={i}>{st}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Improvements */}
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/20 space-y-2">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4" /> Opportunities for Growth:
                      </span>
                      <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                        {sessionData.notes.areasForImprovement.map((imp, i) => (
                          <li key={i}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Topics Discussed */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Technical & Behavioral Concepts Tested
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {sessionData.notes.keyTopicsDiscussed.map((topic, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-950 text-slate-300 border border-slate-800"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Questions & Grounded Answers Log */}
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-300 block">
                      Questions & Copilot Formulations ({sessionData.answers.length})
                    </span>
                    <div className="space-y-2.5">
                      {sessionData.answers.map((ans, idx) => (
                        <div key={idx} className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                          <span className="font-bold text-white block">Q: &ldquo;{ans.questionText}&rdquo;</span>
                          <p className="text-slate-300 leading-relaxed">{ans.answerText}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Thank-You Email Draft */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                        <Mail className="h-4 w-4" /> Automated Post-Interview Thank-You Email Draft
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(sessionData.notes?.thankYouEmailDraft || '');
                          showToast('Copied email to clipboard', 'success');
                        }}
                        className="text-[11px] font-semibold text-slate-400 hover:text-white"
                      >
                        Copy Email
                      </button>
                    </div>
                    <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                      {sessionData.notes.thankYouEmailDraft}
                    </pre>
                  </div>
                </>
              ) : (
                <div className="py-16 text-center space-y-3">
                  <p className="text-xs text-slate-400">Synthesis notes have not been generated yet for this session.</p>
                  <button
                    onClick={async () => {
                      setIsLoading(true);
                      await api.generateNotes(sessionData.session.id);
                      await loadSessionDetails(sessionData.session.id);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-500 hover:bg-purple-400 text-slate-950"
                  >
                    Generate AI Debrief Notes
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-24 text-center text-xs text-slate-500">
              Select a session from the left to view notes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
