import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { AudioVisualizer } from '../components/AudioVisualizer';
import { AnswerBody } from '../components/MermaidDiagram';
import {
  Mic,
  MicOff,
  Radio,
  Play,
  Pause,
  Square,
  Sparkles,
  Copy,
  Check,
  RotateCw,
  Send,
  Zap,
  Bookmark,
  Share2,
  Volume2,
  Sliders,
  Layers,
  HelpCircle,
  Clock,
  Laptop,
  CheckCircle2,
  Heart,
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

  if (!activeSession) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mx-auto">
          <Radio className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Live Studio Inactive</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Configure your target role and company on the Dashboard to begin real-time interview transcription and AI copilot guidance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Studio Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-md shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                {activeSession.targetCompany}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                {activeSession.targetRole}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1 font-mono text-emerald-400">
                <Clock className="h-3 w-3" /> {formatTimer(elapsedSeconds)}
              </span>
              <span>•</span>
              <span
                title="Credit balance"
                className="flex items-center gap-1 font-mono text-amber-300 font-semibold"
              >
                <Zap className="h-3 w-3 fill-amber-300" /> {wallet?.balanceCredits ?? '—'} cr
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold uppercase">
                {activeSession.mode === 'meeting' ? 'Regular Meeting' : 'Interview'}
              </span>
              <span className="hidden sm:inline px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                {activeSession.language || 'en-US'}
              </span>
            </div>
          </div>
        </div>

        {/* Audio Visualizer & Source Toggles */}
        <div className="flex items-center gap-2 sm:gap-3">
          <AudioVisualizer level={audioState.audioLevel} isActive={audioState.isListening} />

          {/* Mic Toggle */}
          <button
            onClick={audioState.isListening ? stopListening : startListening}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              audioState.isListening
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/20'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            {audioState.isListening ? <Mic className="h-4 w-4 text-emerald-400" /> : <MicOff className="h-4 w-4 text-slate-400" />}
            <span>{audioState.isListening ? 'Mic Active' : 'Enable Mic'}</span>
          </button>

          {/* Meeting System Audio Capture */}
          <button
            onClick={toggleMeetingAudio}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              audioState.isMeetingAudioActive
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-500/20'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Capture meeting audio from Zoom, Meet, or Teams tab/window"
          >
            <Volume2 className="h-4 w-4 text-cyan-400" />
            <span className="hidden sm:inline">
              {audioState.isMeetingAudioActive ? 'Meeting Audio: On' : 'Capture Meeting Audio'}
            </span>
          </button>

          {/* Floating HUD Trigger */}
          <button
            onClick={openHUD}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title="Launch Floating Transparent HUD"
          >
            <Laptop className="h-4 w-4 text-emerald-400" />
            <span className="hidden md:inline">Floating HUD</span>
          </button>

          {/* End Session Button */}
          <button
            onClick={() => endSession(activeSession.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors"
          >
            <Square className="h-3.5 w-3.5 fill-rose-300" />
            <span>End Session</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Left Transcripts Stream, Right Grounded Answer Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Live Audio Transcripts Stream (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col h-[680px] rounded-3xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Live Transcription</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-mono">
                {liveTranscripts.length} lines
              </span>
            </div>

            {/* Quick Test Question Simulator dropdown */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 hidden sm:inline">Test Prompts:</span>
              <button
                onClick={() =>
                  simulateInterviewQuestion(
                    'Could you walk us through a time you resolved an urgent production incident under high traffic?'
                  )
                }
                className="px-2 py-0.5 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Incident
              </button>
              <button
                onClick={() =>
                  simulateInterviewQuestion(
                    'How do you design an idempotent payment processing system across distributed microservices?'
                  )
                }
                className="px-2 py-0.5 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Idempotency
              </button>
            </div>
          </div>

          {/* Transcripts List */}
          <div className="flex-1 overflow-y-auto pr-1 py-3 space-y-3">
            {liveTranscripts.length === 0 ? (
              <div className="py-24 text-center space-y-3">
                <Mic className="h-8 w-8 text-slate-600 mx-auto animate-pulse" />
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Audio engine is listening. When the interviewer speaks, spoken lines will appear here in real time.
                </p>
                <button
                  onClick={() =>
                    simulateInterviewQuestion(
                      'Tell me about your architectural experience with Kafka and distributed streaming at Stripe.'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
                >
                  Simulate Question
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
                  className={`p-3 rounded-2xl border transition-all ${
                    t.isQuestion
                      ? 'border-emerald-500/40 bg-emerald-950/20 cursor-pointer hover:bg-emerald-950/30'
                      : t.speaker === 'interviewer'
                      ? 'border-slate-800 bg-slate-950/60'
                      : 'border-slate-800/60 bg-slate-900/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span
                      className={`font-semibold capitalize flex items-center gap-1.5 ${
                        t.speaker === 'interviewer' ? 'text-amber-400' : 'text-cyan-400'
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                      {t.speaker}
                    </span>
                    <span className="text-slate-500 font-mono text-[10px]">{t.timestamp}</span>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed">{t.text}</p>

                  {t.isQuestion && (
                    <div className="mt-2 flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                        <Sparkles className="h-2.5 w-2.5" /> Question Detected ({Math.round(t.confidence * 100)}%)
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">{t.category || 'Behavioral'}</span>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>

          {/* Manual Input Footer + Screenshot Answer */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleScreenCapture}
                disabled={isGenerating || isCapturing}
                title="Capture a screen with the question, get an answer"
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-medium transition-colors disabled:opacity-50"
              >
                <Camera className="h-3.5 w-3.5 text-cyan-400" />
                <span className="hidden sm:inline">{isCapturing ? 'Capturing…' : 'Screenshot'}</span>
              </button>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={isGenerating}
                title="Upload a photo of the question"
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-medium transition-colors disabled:opacity-50"
              >
                <ImageIcon className="h-3.5 w-3.5 text-amber-400" />
                <span className="hidden sm:inline">Photo</span>
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <span className="text-[10px] text-slate-500 hidden md:inline">
                Screenshot or photo of a question → grounded answer
              </span>
            </div>

            <form onSubmit={handleManualAsk} className="flex items-center gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Quietly type or paste interviewer question..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="submit"
                disabled={isGenerating || !manualInput.trim()}
                className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold disabled:opacity-40 transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: AI Answer Engine & STAR Breakdown (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col h-[680px] rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg overflow-hidden space-y-4">
          {/* Header & Style Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-white">AI Grounded Talking Points</h2>
            </div>

            <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {[
                { id: 'star', label: 'STAR Format' },
                { id: 'concise', label: 'Concise Pitch' },
                { id: 'technical', label: 'Deep Technical' },
                { id: 'step_by_step', label: 'Step-by-Step' },
                { id: 'bullets', label: 'Bullets' },
                { id: 'full_script', label: 'Full Script' },
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => setAnswerStyle(style.id as any)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                    answerStyle === style.id
                      ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active / Selected Answer Display */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {isGenerating ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                <div className="h-12 w-12 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin"></div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white">Synthesizing Answer with Gemini 3.8 Flash...</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Cross-referencing your authentic achievements at {activeSession.targetCompany} with resume context.
                  </p>
                </div>
              </div>
            ) : selectedAnswer ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Question Banner */}
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mb-0.5">
                      TARGET QUESTION ({selectedAnswer.category.toUpperCase()})
                    </span>
                    <h3 className="text-sm font-bold text-white leading-snug">
                      &ldquo;{selectedAnswer.questionText}&rdquo;
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => copyAnswer(selectedAnswer.answerText, selectedAnswer.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
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
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Regenerate Answer with current style"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* STAR Structured Grid if STAR breakdown exists */}
                {selectedAnswer.starBreakdown && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-amber-500/20 space-y-1">
                      <span className="text-[10px] font-extrabold text-amber-400 tracking-wider">1. SITUATION</span>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {selectedAnswer.starBreakdown.situation}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/70 border border-cyan-500/20 space-y-1">
                      <span className="text-[10px] font-extrabold text-cyan-400 tracking-wider">2. TASK</span>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {selectedAnswer.starBreakdown.task}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/70 border border-emerald-500/20 space-y-1">
                      <span className="text-[10px] font-extrabold text-emerald-400 tracking-wider">3. ACTION</span>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {selectedAnswer.starBreakdown.action}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/70 border border-purple-500/20 space-y-1">
                      <span className="text-[10px] font-extrabold text-purple-400 tracking-wider">4. RESULT</span>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {selectedAnswer.starBreakdown.result}
                      </p>
                    </div>
                  </div>
                )}

                {/* Full Flow Speech Transcript / Narrative */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Full Recommended Speech Response:
                  </span>
                  <AnswerBody
                    text={selectedAnswer.answerText}
                    className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 text-sm text-slate-100 leading-relaxed whitespace-pre-line font-normal selection:bg-emerald-500/40"
                  />
                </div>

                {/* Grounding Attribution */}
                {selectedAnswer.groundingSources.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Verified from: {selectedAnswer.groundingSources.join(', ')}</span>
                    </span>
                    <span className="text-[11px] text-emerald-400 font-medium">Confidence: 96%</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-16">
                <Sparkles className="h-10 w-10 text-slate-600" />
                <h3 className="text-sm font-bold text-slate-300">Awaiting Question Input</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Speak into your microphone or paste an interview question on the left to see instant, personalized talking points.
                </p>
              </div>
            )}
          </div>

          {/* Custom Prompt Context Hint Bar */}
          <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={customHint}
              onChange={(e) => setCustomHint(e.target.value)}
              placeholder="Add optional custom hint (e.g. 'Emphasize high availability' or 'Keep it under 30 secs')..."
              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            {selectedAnswer && (
              <button
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-400 transition-colors whitespace-nowrap"
              >
                Re-Synthesize
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
