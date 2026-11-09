import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import {
  Sparkles,
  X,
  Minimize2,
  Maximize2,
  Copy,
  Check,
  Send,
  Zap,
  Radio,
  ChevronDown,
  Layers,
} from 'lucide-react';

export const DesktopHUD: React.FC = () => {
  const {
    hudOpen,
    closeHUD,
    hudMinimized,
    toggleMinimizeHUD,
    activeSession,
    liveAnswers,
    addLiveAnswer,
    showToast,
    audioState,
  } = useApp();

  const [manualQuery, setManualQuery] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<'star' | 'concise' | 'technical'>('star');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!hudOpen) return null;

  const latestAnswer = liveAnswers[0];

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;

    if (!activeSession) {
      showToast('Start or select an interview session first', 'error');
      return;
    }

    setIsGenerating(true);
    const query = manualQuery.trim();
    setManualQuery('');

    try {
      const answer = await api.generateAnswer(activeSession.id, query, selectedStyle);
      addLiveAnswer(answer);
      showToast('Answer synthesized!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to formulate answer', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyAnswer = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copied answer to clipboard', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex flex-col rounded-lg border border-emerald-500/30 bg-slate-950/95   transition-all duration-200 ${
        hudMinimized ? 'w-80 h-14' : 'w-[420px] max-h-[580px]'
      }`}
    >
      {/* Title Bar / Drag Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800/80 bg-slate-900/60 rounded-t-2xl cursor-move select-none">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white tracking-tight">AskMeAi HUD</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1 rounded font-mono">
                FLOATING
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {audioState.isListening && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30 mr-1 animate-pulse">
              <Radio className="h-3 w-3" />
              <span>Mic Live</span>
            </span>
          )}
          <button
            onClick={toggleMinimizeHUD}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={hudMinimized ? 'Expand HUD' : 'Minimize HUD'}
          >
            {hudMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={closeHUD}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close HUD (Cmd/Ctrl + Shift + Space to toggle)"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {!hudMinimized && (
        <div className="flex flex-col flex-1 overflow-hidden p-3 space-y-3">
          {/* Quick Style Switcher */}
          <div className="flex items-center justify-between text-xs bg-slate-900/80 p-1 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[11px] px-1 font-medium">Style:</span>
            <div className="flex items-center gap-1">
              {(['star', 'concise', 'technical'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStyle(st)}
                  className={`px-2 py-1 rounded text-[11px] font-semibold uppercase tracking-wider transition-all ${
                    selectedStyle === st
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Latest AI Answer View */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 max-h-[360px]">
            {isGenerating ? (
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-center space-y-2 animate-pulse">
                <div className="flex items-center justify-center gap-2 text-emerald-400 font-semibold text-xs">
                  <Zap className="h-4 w-4 animate-spin" /> Formulating Grounded Answer...
                </div>
                <p className="text-[11px] text-slate-400">
                  Retrieving career experiences from resume and structuring in {selectedStyle.toUpperCase()} format.
                </p>
              </div>
            ) : latestAnswer ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 space-y-2.5 ">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-emerald-300 leading-snug">
                    Q: &ldquo;{latestAnswer.questionText}&rdquo;
                  </span>
                  <button
                    onClick={() => copyAnswer(latestAnswer.answerText, latestAnswer.id)}
                    className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-medium transition-colors"
                  >
                    {copiedId === latestAnswer.id ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy
                      </>
                    )}
                  </button>
                </div>

                {latestAnswer.starBreakdown && (
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className="p-1.5 rounded bg-slate-950 border border-slate-800/80">
                      <span className="font-bold text-amber-400 block text-[10px]">SITUATION</span>
                      <p className="text-slate-300 text-[10px] line-clamp-2">
                        {latestAnswer.starBreakdown.situation}
                      </p>
                    </div>
                    <div className="p-1.5 rounded bg-slate-950 border border-slate-800/80">
                      <span className="font-bold text-cyan-400 block text-[10px]">TASK</span>
                      <p className="text-slate-300 text-[10px] line-clamp-2">
                        {latestAnswer.starBreakdown.task}
                      </p>
                    </div>
                    <div className="p-1.5 rounded bg-slate-950 border border-slate-800/80">
                      <span className="font-bold text-emerald-400 block text-[10px]">ACTION</span>
                      <p className="text-slate-300 text-[10px] line-clamp-2">
                        {latestAnswer.starBreakdown.action}
                      </p>
                    </div>
                    <div className="p-1.5 rounded bg-slate-950 border border-slate-800/80">
                      <span className="font-bold text-purple-400 block text-[10px]">RESULT</span>
                      <p className="text-slate-300 text-[10px] line-clamp-2">
                        {latestAnswer.starBreakdown.result}
                      </p>
                    </div>
                  </div>
                )}

                <div className="p-2.5 rounded-lg bg-slate-950/90 border border-slate-800/90 text-xs text-slate-200 leading-relaxed max-h-48 overflow-y-auto">
                  {latestAnswer.answerText}
                </div>

                {latestAnswer.groundingSources.length > 0 && (
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Layers className="h-3 w-3 text-emerald-400" />
                    <span>Grounded in: {latestAnswer.groundingSources[0]}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-400">
                Listening for interview questions or enter one below.
              </div>
            )}
          </div>

          {/* Quick Question Input */}
          <form onSubmit={handleManualSubmit} className="relative flex items-center">
            <input
              type="text"
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              placeholder="Paste or type interview question..."
              className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <button
              type="submit"
              disabled={isGenerating || !manualQuery.trim()}
              className="absolute right-1.5 p-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-40 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
