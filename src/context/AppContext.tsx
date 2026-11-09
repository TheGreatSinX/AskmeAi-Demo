import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import {
  User,
  CreditWallet,
  Subscription,
  Resume,
  KnowledgeDocument,
  InterviewSession,
  UserDevice,
  TranscriptLine,
  SessionAnswer,
  AnswerStyle,
} from '../types';
import { api } from '../lib/api';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AudioState {
  isListening: boolean;
  selectedMicId: string;
  audioSource: 'mic' | 'system_meeting' | 'both';
  audioLevel: number;
  isMeetingAudioActive: boolean;
  meetingAppName?: string;
  permissionGranted: boolean;
  error?: string;
}

interface AppContextType {
  user: User | null;
  wallet: CreditWallet | null;
  subscription: Subscription | null;
  devices: UserDevice[];
  resumes: Resume[];
  documents: KnowledgeDocument[];
  sessions: InterviewSession[];
  activeSession: InterviewSession | null;
  activeTab: string;
  toasts: Toast[];
  audioState: AudioState;
  hudOpen: boolean;
  hudMinimized: boolean;
  refillModalOpen: boolean;
  electronGuideOpen: boolean;
  setActiveTab: (tab: string) => void;
  setActiveSession: (session: InterviewSession | null) => void;
  refreshState: () => Promise<void>;
  /**
   * Set when the API behind this page is missing (the page was served without
   * the Express server). The UI shows a full-screen notice instead of an app
   * full of silent failures.
   */
  backendError: string | null;
  /**
   * Set when the signed-in Google account is not on the invitation-only
   * enrolled list. The UI shows a dedicated wall instead of the app.
   */
  notEnrolled: string | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
  // Audio controls
  startListening: () => Promise<void>;
  stopListening: () => void;
  toggleMeetingAudio: () => Promise<void>;
  setSelectedMicId: (micId: string) => void;
  // HUD controls
  openHUD: () => void;
  closeHUD: () => void;
  toggleHUD: () => void;
  toggleMinimizeHUD: () => void;
  setRefillModalOpen: (open: boolean) => void;
  setElectronGuideOpen: (open: boolean) => void;
  // Quick session launcher
  startNewSession: (
    targetRole: string,
    targetCompany: string,
    resumeId?: string,
    options?: {
      mode?: 'interview' | 'meeting';
      instructions?: string;
      language?: string;
      /** Wizard preferences (ParakeetAI parity) */
      answerStyle?: AnswerStyle;
      autoAnswer?: boolean;
      saveTranscript?: boolean;
      model?: string;
    }
  ) => Promise<InterviewSession>;
  /** Configured AI model ids (primary first) for the create-session wizard. */
  aiModels: string[];
  endSession: (sessionId: string) => Promise<void>;
  // Live transcripts and answers cache
  liveTranscripts: TranscriptLine[];
  liveAnswers: SessionAnswer[];
  addLiveTranscript: (line: TranscriptLine) => void;
  addLiveAnswer: (answer: SessionAnswer) => void;
  setLiveTranscripts: React.Dispatch<React.SetStateAction<TranscriptLine[]>>;
  setLiveAnswers: React.Dispatch<React.SetStateAction<SessionAnswer[]>>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<CreditWallet | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);
  const activeSessionRef = useRef<InterviewSession | null>(null);

  // Keep the ref in sync so refreshState() can read it without re-creating
  // (and therefore re-running) its mount effect.
  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [notEnrolled, setNotEnrolled] = useState<string | null>(null);
  const [aiModels, setAiModels] = useState<string[]>([]);

  // HUD and modal states
  const [hudOpen, setHudOpen] = useState<boolean>(false);
  const [hudMinimized, setHudMinimized] = useState<boolean>(false);
  const [refillModalOpen, setRefillModalOpen] = useState<boolean>(false);
  const [electronGuideOpen, setElectronGuideOpen] = useState<boolean>(false);

  // Live session stream state
  const [liveTranscripts, setLiveTranscripts] = useState<TranscriptLine[]>([]);
  const [liveAnswers, setLiveAnswers] = useState<SessionAnswer[]>([]);

  // Audio Processing State
  const [audioState, setAudioState] = useState<AudioState>({
    isListening: false,
    selectedMicId: 'default',
    audioSource: 'mic',
    audioLevel: 0,
    isMeetingAudioActive: false,
    permissionGranted: false,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const refreshState = useCallback(async () => {
    try {
      const data = await api.getInitialState();
      setBackendError(null);
      setUser(data.user);
      setWallet(data.wallet);
      setSubscription(data.subscription);
      setDevices(data.devices);
      setResumes(data.resumes);
      setDocuments(data.documents);
      setSessions(data.sessions);
      setAiModels(data.aiModels || []);

      // If active session exists, retain or load
      const current = activeSessionRef.current;
      if (!current && data.sessions.length > 0) {
        const ongoing = data.sessions.find((s) => s.status === 'active' || s.status === 'paused');
        if (ongoing) {
          activeSessionRef.current = ongoing;
          setActiveSession(ongoing);
          const full = await api.getSessionData(ongoing.id);
          setLiveTranscripts(full.transcripts || []);
          setLiveAnswers(full.answers || []);
        }
      }
    } catch (e: any) {
      if (e?.code === 'backend-missing') {
        // No API behind this URL: stop here and let the full-screen notice
        // explain, instead of toasting every request for the whole session.
        console.error('Backend unreachable:', e.message);
        setBackendError(e.message);
        return;
      }

      // Invitation-only platform: a signed-in Google account that is not on
      // the enrolled list is refused with 403. Show a dedicated wall instead
      // of the app (and keep the generic error path for everything else).
      if (e?.status === 403 && /not enrolled|enrolment|invitation/i.test(e?.message || '')) {
        setNotEnrolled(e.message);
        showToast(e.message, 'error');
        return;
      }

      console.error('Failed to load initial state:', e);
      showToast(e?.message || 'Could not sync with cloud database', 'error');
    }
  }, [showToast]);

  // Initial load & device registration (runs once per signed-in session)
  useEffect(() => {
    refreshState();

    // Register active device on load to enforce (1 Desktop + 1 Mobile)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    api.registerDevice(isMobile ? 'mobile' : 'desktop', navigator.platform || 'Current Client').then((res) => {
      if (res.revokedOldDevice) {
        showToast(
          `Logged in on this device. Replaced previous active ${res.revokedOldDevice.deviceType} session.`,
          'info'
        );
      }
    }).catch((e) => console.warn('Device registration failed:', e));

    // Global keyboard shortcut listeners: Cmd/Ctrl + Shift + Space toggles Floating HUD
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'Space') {
        e.preventDefault();
        setHudOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [refreshState, showToast]);

  // Web Audio Analyser Loop
  const monitorAudioLevels = useCallback(() => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / dataArray.length;
    const level = Math.min(100, Math.round((avg / 128) * 100));

    setAudioState((prev) => ({ ...prev, audioLevel: level }));
    animFrameRef.current = requestAnimationFrame(monitorAudioLevels);
  }, []);

  // Audio Capture - Microphone
  const startListening = async () => {
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioCtx();
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: audioState.selectedMicId !== 'default' ? { exact: audioState.selectedMicId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      micStreamRef.current = stream;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      monitorAudioLevels();

      // Initialize Web Speech API for real-time transcription if supported
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        // ParakeetAI-style language selection: follow the session's language (default en-US).
        recognition.lang = activeSession?.language || 'en-US';

        recognition.onresult = async (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const text = event.results[i][0].transcript.trim();
              if (text && activeSession) {
                try {
                  const line = await api.submitTranscript(activeSession.id, 'interviewer', text);
                  setLiveTranscripts((prev) => [...prev, line]);

                  // Question detected with high confidence -> honour the session's
                  // Auto Answer preference (off = Live Studio offers a manual Answer).
                  if (line.isQuestion && line.confidence > 0.75) {
                    const confidence = Math.round(line.confidence * 100);
                    if (activeSession.autoAnswer === false) {
                      showToast(`Question detected (${confidence}% match) — auto-answer is off`, 'info');
                    } else {
                      const style = activeSession.answerStyle || 'star';
                      showToast(`Detected Interviewer Question (${confidence}% match)`, 'info');
                      api
                        .generateAnswer(activeSession.id, line.text, style)
                        .then((ans) => {
                          setLiveAnswers((prev) => [ans, ...prev]);
                          showToast(
                            style === 'star' ? 'New STAR Answer Formulated' : 'New Answer Formulated',
                            'success'
                          );
                        })
                        .catch((err) => console.error('Auto-answer error:', err));
                    }
                  }
                } catch (e) {
                  console.error('Transcript error:', e);
                }
              }
            }
          }
        };

        recognition.onerror = (e: any) => {
          if (e.error !== 'no-speech') {
            console.warn('Speech recognition notice:', e.error);
          }
        };

        recognition.onend = () => {
          // Keep active if user is still in listening mode
          if (audioState.isListening) {
            try {
              recognition.start();
            } catch (_) {}
          }
        };

        try {
          recognition.start();
          recognitionRef.current = recognition;
        } catch (_) {}
      }

      setAudioState((prev) => ({
        ...prev,
        isListening: true,
        permissionGranted: true,
        error: undefined,
      }));
      showToast('Microphone live. Listening for interview questions...', 'success');
    } catch (err: any) {
      console.error('Audio capture error:', err);
      setAudioState((prev) => ({
        ...prev,
        isListening: false,
        error: err.message || 'Microphone access denied',
      }));
      showToast(err.message || 'Microphone access denied', 'error');
    }
  };

  const stopListening = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }
    setAudioState((prev) => ({
      ...prev,
      isListening: false,
      audioLevel: 0,
    }));
    showToast('Audio capture paused', 'info');
  };

  // Meeting Audio Capture (Zoom, Google Meet, Teams, Webex via getDisplayMedia)
  const toggleMeetingAudio = async () => {
    if (audioState.isMeetingAudioActive) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }
      setAudioState((prev) => ({ ...prev, isMeetingAudioActive: false, meetingAppName: undefined }));
      showToast('Meeting audio disconnected', 'info');
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        // Ensure audio track was shared
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
          showToast('No audio track selected. Make sure to check "Share audio" in the browser dialog.', 'error');
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        screenStreamRef.current = stream;

        // Hook meeting audio stream into AudioContext
        if (!audioContextRef.current) {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioCtx();
        }
        const source = audioContextRef.current.createMediaStreamSource(stream);
        if (analyserRef.current) {
          source.connect(analyserRef.current);
        }

        // When user stops sharing from browser banner
        audioTracks[0].onended = () => {
          setAudioState((prev) => ({ ...prev, isMeetingAudioActive: false }));
        };

        setAudioState((prev) => ({
          ...prev,
          isMeetingAudioActive: true,
          meetingAppName: 'Active Meeting Feed (Zoom/Meet/Teams)',
        }));
        showToast('Connected to Meeting Audio Stream!', 'success');
      } catch (err: any) {
        console.warn('Meeting audio capture cancelled:', err);
      }
    }
  };

  const setSelectedMicId = (micId: string) => {
    setAudioState((prev) => ({ ...prev, selectedMicId: micId }));
  };

  const startNewSession = async (
    targetRole: string,
    targetCompany: string,
    resumeId?: string,
    options?: {
      mode?: 'interview' | 'meeting';
      instructions?: string;
      language?: string;
      answerStyle?: AnswerStyle;
      autoAnswer?: boolean;
      saveTranscript?: boolean;
      model?: string;
    }
  ) => {
    const session = await api.createSession({
      targetRole,
      targetCompany,
      resumeId,
      mode: options?.mode,
      instructions: options?.instructions,
      language: options?.language,
      answerStyle: options?.answerStyle,
      autoAnswer: options?.autoAnswer,
      saveTranscript: options?.saveTranscript,
      model: options?.model,
    });
    setActiveSession(session);
    setLiveTranscripts([]);
    setLiveAnswers([]);
    setSessions((prev) => [session, ...prev]);
    setActiveTab('studio');
    showToast(`Interview Session Started for ${targetCompany}`, 'success');
    return session;
  };

  const endSession = async (sessionId: string) => {
    stopListening();
    const updated = await api.updateSessionStatus(sessionId, 'completed', 1800);
    setActiveSession(null);
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? updated : s)));
    showToast('Session completed. Generating comprehensive AI debrief notes...', 'info');
    api.generateNotes(sessionId).then(() => {
      showToast('AI Session Notes and Feedback ready!', 'success');
      setActiveTab('notes');
    });
  };

  const addLiveTranscript = (line: TranscriptLine) => {
    setLiveTranscripts((prev) => [...prev, line]);
  };

  const addLiveAnswer = (answer: SessionAnswer) => {
    setLiveAnswers((prev) => [answer, ...prev]);
  };

  const openHUD = () => {
    setHudOpen(true);
    setHudMinimized(false);
  };
  const closeHUD = () => setHudOpen(false);
  const toggleHUD = () => setHudOpen((prev) => !prev);
  const toggleMinimizeHUD = () => setHudMinimized((prev) => !prev);

  return (
    <AppContext.Provider
      value={{
        user,
        wallet,
        subscription,
        devices,
        resumes,
        documents,
        sessions,
        activeSession,
        activeTab,
        toasts,
        audioState,
        hudOpen,
        hudMinimized,
        refillModalOpen,
        electronGuideOpen,
        setActiveTab,
        setActiveSession,
        refreshState,
        backendError,
        notEnrolled,
        showToast,
        dismissToast,
        startListening,
        stopListening,
        toggleMeetingAudio,
        setSelectedMicId,
        openHUD,
        closeHUD,
        toggleHUD,
        toggleMinimizeHUD,
        setRefillModalOpen,
        setElectronGuideOpen,
        startNewSession,
        aiModels,
        endSession,
        liveTranscripts,
        liveAnswers,
        addLiveTranscript,
        addLiveAnswer,
        setLiveTranscripts,
        setLiveAnswers,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
