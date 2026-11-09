import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { AudioVisualizer } from '../components/AudioVisualizer';
import { AnswerBody } from '../components/MermaidDiagram';
import {
  Mic,
  MicOff,
  Radio,
  Square,
  Sparkles,
  Copy,
  Check,
  RotateCw,
  Send,
  Zap,
  Volume2,
  Layers,
  Clock,
  Laptop,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import { AnswerStyle, SessionAnswer } from '../types';

export const LiveStudioView: React.FC = () => {
  const {
    activeSession,
    audioState,
    startListening,
    stopListening,
    toggleMeetingAudio,
    liveTranscripts,
    liveAnswers,
    addLiveTranscript,
    addLiveAnswer,
    endSession,
    wallet,
    showToast,
    openHUD,
  } = useApp();

  const [answerStyle, setAnswerStyle] = useState<AnswerStyle>('star');
  const [manualInput, setManualInput] = useState('');
  const [customHint, setCustomHint] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<SessionAnswer | null>(null);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll transcripts
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveTranscripts]);

  // Session timer
  useEffect(() => {
    if (!activeSession || isPaused) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession, isPaused]);

  // Sync selected answer with latest answer if none selected
  useEffect(() => {
    if (liveAnswers.length > 0 && !selectedAnswer) {
      setSelectedAnswer(liveAnswers[0]);
    }
  }, [liveAnswers, selectedAnswer]);

  // The create-session wizard's answer-format preference becomes the studio
  // default (and the format auto/manual answers are generated in).
  useEffect(() => {
    if (activeSession?.answerStyle) setAnswerStyle(activeSession.answerStyle);
  }, [activeSession?.id, activeSession?.answerStyle]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleManualAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    if (!activeSession) {
      showToast('No active session. Please start a session first.', 'error');
      return;
    }

    const question = manualInput.trim();
    setManualInput('');

    // Append transcript line
    const line = await api.submitTranscript(activeSession.id, 'interviewer', question);
    addLiveTranscript(line);

    setIsGenerating(true);
    try {
      const answer = await api.generateAnswer(activeSession.id, question, answerStyle, customHint);
      addLiveAnswer(answer);
      setSelectedAnswer(answer);
      showToast('Grounded answer formulated!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Answer generation failed', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!selectedAnswer || !activeSession) return;
    setIsGenerating(true);
    try {
      const answer = await api.generateAnswer(
        activeSession.id,
        selectedAnswer.questionText,
        answerStyle,
        customHint ? `Emphasis: ${customHint}` : undefined
      );
      addLiveAnswer(answer);
      setSelectedAnswer(answer);
      showToast('Answer regenerated with updated style!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Regeneration failed', 'error');
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

  /** Manual trigger shown on detected questions — the "Auto Answer off" path. */
  const answerQuestionNow = async (text: string) => {
    if (!activeSession || isGenerating) return;
    setIsGenerating(true);
    try {
      const answer = await api.generateAnswer(activeSession.id, text, answerStyle, customHint || undefined);
      addLiveAnswer(answer);
      setSelectedAnswer(answer);
      showToast('Answer formulated', 'success');
    } catch (e: any) {
      showToast(e.message || 'Answer generation failed', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Screenshot / photo of a question -> grounded answer (ParakeetAI) ──────
  /** Downscale to max 1600px wide JPEG so payloads stay small on every path. */
  const toJpegDataUrl = (source: HTMLImageElement | HTMLVideoElement): string => {
    const w = (source as HTMLVideoElement).videoWidth || (source as HTMLImageElement).naturalWidth;
    const h = (source as HTMLVideoElement).videoHeight || (source as HTMLImageElement).naturalHeight;
    const scale = Math.min(1, 1600 / Math.max(1, w));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(source as any, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const sendImageForAnswer = async (dataUrl: string) => {
    if (!activeSession || !dataUrl) return;
    const base64 = dataUrl.split(',')[1] || '';
    if (!base64) {
      showToast('Could not read that image', 'error');
      return;
    }
    setIsGenerating(true);
    try {
      const answer = await api.answerFromImage(activeSession.id, {
        imageBase64: base64,
        mimeType: 'image/jpeg',
        answerStyle,
        customHint: customHint || undefined,
      });
      addLiveAnswer(answer);
      setSelectedAnswer(answer);
      showToast('Question read from image — answer formulated!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Image answer failed', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please choose an image file', 'error');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const dataUrl = toJpegDataUrl(img);
      URL.revokeObjectURL(url);
      void sendImageForAnswer(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      showToast('Could not load that image', 'error');
    };
    img.src = url;
  };

  const handleScreenCapture = async () => {
    if (!activeSession) {
      showToast('Please launch a session first', 'error');
      return;
    }
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      // Give the compositor a moment so the first frame is actually painted.
      await new Promise((r) => setTimeout(r, 400));
      const dataUrl = toJpegDataUrl(video);
      stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
      if (!dataUrl) {
        showToast('Capture failed — try the photo upload instead', 'error');
        return;
      }
      await sendImageForAnswer(dataUrl);
    } catch (err: any) {
      if (err?.name !== 'NotAllowedError') {
        console.warn('Screen capture error:', err);
      }
      showToast('Screen capture cancelled', 'info');
    } finally {
      setIsCapturing(false);
    }
  };

  // Sample prompt simulator for testing when user is in silent environment
  const simulateInterviewQuestion = async (sampleQuestion: string) => {
    if (!activeSession) {
      showToast('Please launch a session first', 'error');
      return;
    }
    const line = await api.submitTranscript(activeSession.id, 'interviewer', sampleQuestion);
    addLiveTranscript(line);

    setIsGenerating(true);
    try {
      const answer = await api.generateAnswer(activeSession.id, sampleQuestion, answerStyle);
      addLiveAnswer(answer);
      setSelectedAnswer(answer);
      showToast(`Question detected (${Math.round(line.confidence * 100)}% confidence)`, 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const toolBtn =
    'flex items-center gap-1.5 rounded-lg border px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.08em] transition-colors';

  if (!activeSession) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-20 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-slate-700 bg-slate-900">
          <Radio className="h-5 w-5 text-slate-500" />
        </div>
        <p className="micro">Live studio</p>
        <h2 className="display text-3xl text-slate-100">The studio is idle.</h2>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-400">
          Configure your target role and company on the dashboard to begin real-time transcription and copilot
          guidance.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-12">
      {/* Studio header bar */}
      <div className="panel flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/10">
            <Radio className="h-4 w-4 animate-pulse text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight text-slate-100">{activeSession.targetCompany}</h1>
              <span className="rounded border border-slate-800 bg-slate-950 px-1.5 py-0.5 text-[10.5px] text-slate-400">
                {activeSession.targetRole}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 font-mono text-[10.5px] text-slate-500">
              <span className="flex items-center gap-1 text-emerald-400">
                <Clock className="h-3 w-3" /> {formatTimer(elapsedSeconds)}
              </span>
              <span>·</span>
              <span title="Credit balance" className="flex items-center gap-1 text-amber-400">
                <Zap className="h-3 w-3 fill-amber-400" /> {wallet?.balanceCredits ?? '—'} cr
              </span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden uppercase tracking-[0.1em] sm:inline">
                {activeSession.mode === 'meeting' ? 'Regular meeting' : 'Interview'}
              </span>
              <span className="hidden sm:inline">{activeSession.language || 'en-US'}</span>
            </div>
          </div>
        </div>

        {/* Audio visualizer & source toggles */}
        <div className="flex flex-wrap items-center gap-2">
          <AudioVisualizer level={audioState.audioLevel} isActive={audioState.isListening} />

          <button
            onClick={audioState.isListening ? stopListening : startListening}
            className={`${toolBtn} ${
              audioState.isListening
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            {audioState.isListening ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
            <span>{audioState.isListening ? 'Mic active' : 'Enable mic'}</span>
          </button>

          <button
            onClick={toggleMeetingAudio}
            title="Capture meeting audio from Zoom, Meet, or Teams tab/window"
            className={`${toolBtn} ${
              audioState.isMeetingAudioActive
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {audioState.isMeetingAudioActive ? 'Meeting audio on' : 'Capture meeting audio'}
            </span>
          </button>

          <button
            onClick={openHUD}
            title="Launch floating HUD"
            className={`${toolBtn} border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200`}
          >
            <Laptop className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Floating HUD</span>
          </button>

          <button
            onClick={() => endSession(activeSession.id)}
            className={`${toolBtn} border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/15`}
          >
            <Square className="h-3 w-3 fill-rose-400" />
            <span>End session</span>
          </button>
        </div>
      </div>

      {/* Studio grid: transcripts stream + answer engine */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left: live transcription */}
        <div className="panel flex h-[680px] flex-col overflow-hidden p-4 lg:col-span-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="micro">Live transcription</span>
              <span className="rounded border border-slate-800 bg-slate-950 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                {liveTranscripts.length} lines
              </span>
            </div>

            {/* Quick test question simulator */}
            <div className="flex items-center gap-1">
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.1em] text-slate-600 sm:inline">
                Test prompts:
              </span>
              <button
                onClick={() =>
                  simulateInterviewQuestion(
                    'Could you walk us through a time you resolved an urgent production incident under high traffic?'
                  )
                }
                className="rounded border border-slate-800 bg-slate-950 px-2 py-0.5 font-mono text-[10px] text-slate-400 transition-colors hover:text-slate-200"
              >
                Incident
              </button>
              <button
                onClick={() =>
                  simulateInterviewQuestion(
                    'How do you design an idempotent payment processing system across distributed microservices?'
                  )
                }
                className="rounded border border-slate-800 bg-slate-950 px-2 py-0.5 font-mono text-[10px] text-slate-400 transition-colors hover:text-slate-200"
              >
                Idempotency
              </button>
            </div>
          </div>

          {/* Transcript list */}
          <div className="flex-1 space-y-3 overflow-y-auto py-3 pr-1">
            {liveTranscripts.length === 0 ? (
              <div className="space-y-3 py-24 text-center">
                <Mic className="mx-auto h-7 w-7 animate-pulse text-slate-700" />
                <p className="mx-auto max-w-xs text-xs leading-relaxed text-slate-500">
                  The audio engine is listening. When the interviewer speaks, lines appear here in real time.
                </p>
                <button
                  onClick={() =>
                    simulateInterviewQuestion(
                      'Tell me about your architectural experience with Kafka and distributed streaming at Stripe.'
                    )
                  }
                  className="btn btn-ghost"
                >
                  Simulate question
                </button>
              </div>
            ) : (
              liveTranscripts.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    if (t.isQuestion) {
                      const match = liveAnswers.find((a) => a.questionText === t.text);
                      if (match) setSelectedAnswer(match);
                    }
                  }}
                  className={`rounded-lg border p-3 transition-colors ${
                    t.isQuestion
                      ? 'cursor-pointer border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10'
                      : t.speaker === 'interviewer'
                        ? 'border-slate-800 bg-slate-950'
                        : 'border-slate-800 bg-slate-900'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span
                      className={`flex items-center gap-1.5 capitalize ${
                        t.speaker === 'interviewer' ? 'font-medium text-slate-200' : 'text-slate-500'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          t.speaker === 'interviewer' ? 'bg-slate-300' : 'bg-slate-600'
                        }`}
                      ></span>
                      {t.speaker}
                    </span>
                    <span className="font-mono text-[10px] text-slate-600">{t.timestamp}</span>
                  </div>

                  <p className="text-xs leading-relaxed text-slate-300">{t.text}</p>

                  {t.isQuestion && (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-emerald-400">
                        <Sparkles className="h-2.5 w-2.5" /> Question · {Math.round(t.confidence * 100)}%
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-600">
                          {t.category || 'Behavioral'}
                        </span>
                        {!liveAnswers.some((a) => a.questionText === t.text) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void answerQuestionNow(t.text);
                            }}
                            disabled={isGenerating}
                            title="Generate an answer for this question"
                            className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                          >
                            Answer
                          </button>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>

          {/* Manual input footer + screenshot answer */}
          <div className="space-y-2 border-t border-slate-800 pt-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleScreenCapture}
                disabled={isGenerating || isCapturing}
                title="Capture a screen with the question, get an answer"
                className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-slate-400 transition-colors hover:text-slate-200 disabled:opacity-50"
              >
                <Camera className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{isCapturing ? 'Capturing…' : 'Screenshot'}</span>
              </button>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={isGenerating}
                title="Upload a photo of the question"
                className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-slate-400 transition-colors hover:text-slate-200 disabled:opacity-50"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Photo</span>
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <span className="hidden text-[10px] text-slate-600 md:inline">
                Screenshot or photo of a question → grounded answer
              </span>
            </div>

            <form onSubmit={handleManualAsk} className="flex items-center gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Quietly type or paste an interviewer question…"
                className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-600 transition-colors focus:border-emerald-500/60 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isGenerating || !manualInput.trim()}
                aria-label="Ask question"
                className="rounded-lg bg-emerald-400 p-2.5 text-[#052e1c] transition-colors hover:bg-emerald-300 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right: answer engine */}
        <div className="panel flex h-[680px] flex-col space-y-4 overflow-hidden p-5 lg:col-span-7">
          {/* Header & style switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <p className="micro">Grounded talking points</p>

            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1">
              {[
                { id: 'star', label: 'STAR' },
                { id: 'concise', label: 'Concise' },
                { id: 'technical', label: 'Technical' },
                { id: 'step_by_step', label: 'Step-by-step' },
                { id: 'bullets', label: 'Bullets' },
                { id: 'full_script', label: 'Full script' },
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => setAnswerStyle(style.id as any)}
                  aria-pressed={answerStyle === style.id}
                  className={`rounded-md px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.06em] transition-colors ${
                    answerStyle === style.id
                      ? 'bg-emerald-400 text-[#052e1c]'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active / selected answer display */}
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {isGenerating ? (
              <div className="flex h-full flex-col items-center justify-center space-y-3 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border border-emerald-400 border-t-transparent"></div>
                <div className="space-y-1">
                  <p className="micro">Synthesizing</p>
                  <p className="text-sm font-medium text-slate-200">Formulating a grounded answer…</p>
                  <p className="mx-auto max-w-sm text-xs leading-relaxed text-slate-500">
                    Cross-referencing your authentic achievements at {activeSession.targetCompany} with resume context.
                  </p>
                </div>
              </div>
            ) : selectedAnswer ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Question banner */}
                <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3.5">
                  <div>
                    <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-400">
                      Target question · {selectedAnswer.category}
                    </span>
                    <h3 className="text-sm font-medium leading-snug text-slate-100">
                      &ldquo;{selectedAnswer.questionText}&rdquo;
                    </h3>
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => copyAnswer(selectedAnswer.answerText, selectedAnswer.id)}
                      className="flex items-center gap-1 rounded border border-slate-800 bg-slate-900 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-slate-400 transition-colors hover:text-slate-200"
                    >
                      {copiedId === selectedAnswer.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleRegenerate}
                      title="Regenerate answer with current style"
                      className="rounded border border-slate-800 bg-slate-900 p-1.5 text-slate-400 transition-colors hover:text-slate-200"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* STAR structured grid */}
                {selectedAnswer.starBreakdown && (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {[
                      { n: '01', label: 'Situation', text: selectedAnswer.starBreakdown.situation },
                      { n: '02', label: 'Task', text: selectedAnswer.starBreakdown.task },
                      { n: '03', label: 'Action', text: selectedAnswer.starBreakdown.action },
                      { n: '04', label: 'Result', text: selectedAnswer.starBreakdown.result },
                    ].map((part) => (
                      <div key={part.n} className="space-y-1.5 rounded-lg border border-slate-800 bg-slate-950 p-3">
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                          {part.n} — {part.label}
                        </span>
                        <p className="text-xs leading-relaxed text-slate-300">{part.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Full recommended speech response */}
                <div className="space-y-1.5">
                  <span className="micro">Full recommended speech response</span>
                  <AnswerBody
                    text={selectedAnswer.answerText}
                    className="whitespace-pre-line rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm font-normal leading-relaxed text-slate-200 selection:bg-emerald-500/30"
                  />
                </div>

                {/* Grounding attribution */}
                {selectedAnswer.groundingSources.length > 0 && (
                  <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-slate-600" />
                      <span>Verified from: {selectedAnswer.groundingSources.join(', ')}</span>
                    </span>
                    <span className="font-mono text-[10.5px] text-emerald-400">Confidence 96%</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center space-y-3 py-16 text-center">
                <Sparkles className="h-7 w-7 text-slate-700" />
                <p className="micro">Awaiting question</p>
                <p className="max-w-sm text-xs leading-relaxed text-slate-500">
                  Speak into your microphone or paste an interview question on the left to see instant, personalized
                  talking points.
                </p>
              </div>
            )}
          </div>

          {/* Custom hint bar */}
          <div className="flex items-center gap-2 border-t border-slate-800 pt-3">
            <input
              type="text"
              value={customHint}
              onChange={(e) => setCustomHint(e.target.value)}
              placeholder="Optional hint — e.g. 'emphasize high availability' or 'keep it under 30 secs'"
              className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 placeholder-slate-600 transition-colors focus:border-emerald-500/60 focus:outline-none"
            />
            {selectedAnswer && (
              <button
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="whitespace-nowrap rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-slate-400 transition-colors hover:text-slate-200 disabled:opacity-50"
              >
                Re-synthesize
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
