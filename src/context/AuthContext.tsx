import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth, authEnabled } from '../lib/firebase';
import { setTokenProvider } from '../lib/authToken';
import { isDemoMode, looksLikeSpaShell, onDemoModeChange, setDemoMode } from '../lib/api';

interface AuthContextType {
  /** VITE_FIREBASE_* configuration present in the browser bundle. */
  authEnabled: boolean;
  /** True while the initial Firebase session is being resolved. */
  initializing: boolean;
  firebaseUser: FirebaseUser | null;
  /** Misconfiguration detected at runtime (e.g. server requires auth we can't perform). */
  configError: string | null;
  setConfigError: (message: string | null) => void;
  /**
   * No API behind this URL (static host): data is served by the in-browser
   * demo backend. Drives the "Explore the demo" bypass and the DEMO chip.
   */
  demoMode: boolean;
  /** The visitor chose to enter the demo (or was already past the gate). */
  enterDemo: () => void;
  /** True when the app may render its main shell (signed in, or running in demo mode). */
  ready: boolean;
  /** The only sign-in path: Google via Firebase popup. */
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function friendlyAuthError(err: any): string {
  const code = err?.code || '';
  const map: Record<string, string> = {
    'auth/popup-closed-by-user': 'Sign-in was cancelled before completion.',
    'auth/popup-blocked': 'Your browser blocked the sign-in popup. Allow popups and retry.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Network error. Check your connection and retry.',
    'auth/configuration-not-found': 'Google sign-in is not enabled for this Firebase project.',
    'auth/operation-not-allowed':
      'That sign-in method is not enabled for this Firebase project. Enable it under Authentication → Sign-in method.',
    'auth/unauthorized-domain':
      'This domain is not authorized for Firebase sign-in. Add it under Authentication → Settings → Authorized domains.',
    'auth/invalid-api-key': 'Firebase configuration error: the API key is missing or invalid.',
    'auth/api-key-not-valid-but-by-project': 'Firebase configuration error: the API key is not valid for this project.',
    'auth/app-not-authorized': 'This app is not authorized to use Firebase Authentication.',
    'auth/user-disabled': 'This account has been disabled. Contact an administrator.',
    'auth/requires-recent-login': 'For security, please sign in again before continuing.',
    'auth/internal-error': 'Firebase returned an unexpected error. Please try again.',
  };
  if (map[code]) return map[code];
  if (code.startsWith('auth/')) return err.message.replace(/^Firebase:\s*/i, '').replace(/\s*\(auth\/[^)]+\)\s*$/, '');
  return err?.message || 'Authentication failed.';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [initializing, setInitializing] = useState(authEnabled);
  const [configError, setConfigError] = useState<string | null>(null);
  const [demoMode, setDemoModeState] = useState(isDemoMode());
  const [demoEntered, setDemoEntered] = useState(false);
  const userRef = useRef<FirebaseUser | null>(null);

  // The API layer flips demo mode when it discovers the SPA shell behind an
  // /api path; mirror that here so the login screen and navbar can react.
  useEffect(() => onDemoModeChange(setDemoModeState), []);

  // Keep the API layer pointed at the active session's ID token.
  useEffect(() => {
    if (!authEnabled || !auth) {
      setTokenProvider(null);
      return;
    }

    setTokenProvider(async (forceRefresh = false) => {
      const current = userRef.current;
      if (!current) return null;
      return current.getIdToken(forceRefresh);
    });

    const unsubscribe = onAuthStateChanged(
      auth!,
      (user) => {
        userRef.current = user;
        setFirebaseUser(user);
        setInitializing(false);
      },
      (err) => {
        console.error('Auth state error:', err);
        setInitializing(false);
      }
    );

    return () => {
      unsubscribe();
      setTokenProvider(null);
    };
  }, []);

  // Probe /api/health on every load:
  //  - a JSON answer may carry authRequired, which matters when this build has
  //    no Firebase configuration (that combination means a broken build);
  //  - a non-JSON answer (our own SPA shell, a 502 page, a 404) proves this
  //    origin serves no API, which switches the app into in-browser demo mode.
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    fetch('/api/health', { signal: controller.signal })
      .then(async (res) => {
        const text = await res.text();
        if (cancelled) return;

        const trimmed = text.trim();
        const isJson = trimmed.startsWith('{') || trimmed.startsWith('[');
        if (!isJson) {
          if (!res.ok || looksLikeSpaShell(text)) setDemoMode(true);
          return;
        }

        const health = JSON.parse(trimmed);
        if (!authEnabled && health?.authRequired) {
          setConfigError(
            'This server requires Firebase Auth, but this build has no VITE_FIREBASE_* configuration. ' +
              'Add the Firebase web config to .env and restart the dev server.'
          );
        }
      })
      .catch(() => {
        /* server not reachable yet; AppContext surfaces the sync error */
      })
      .finally(() => clearTimeout(timer));

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!auth) throw new Error('Firebase Auth is not configured.');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err: any) {
      // Cross-Origin-Opener-Policy may block window.close in the popup,
      // but sign-in may still have succeeded. Check current user.
      if (err.code === 'auth/popup-closed-by-user') {
        throw new Error(friendlyAuthError(err));
      }
      const currentUser = auth.currentUser;
      if (currentUser) {
        userRef.current = currentUser;
        setFirebaseUser(currentUser);
        return;
      }
      throw new Error(friendlyAuthError(err));
    }
  }, []);

  const enterDemo = useCallback(() => {
    setDemoMode(true);
    setDemoEntered(true);
  }, []);

  // Escape hatch for static hosts without an API: ?demo=1 skips the Google
  // gate and boots straight into the in-browser demo backend.
  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get('demo') === '1') enterDemo();
    } catch {
      /* no window/location in exotic runtimes; gate renders normally */
    }
  }, [enterDemo]);

  const signOut = useCallback(async () => {
    setDemoEntered(false); // back to the login screen
    if (auth) await firebaseSignOut(auth);
  }, []);

  const value: AuthContextType = {
    authEnabled,
    initializing,
    firebaseUser,
    configError,
    setConfigError,
    demoMode,
    enterDemo,
    ready:
      demoEntered || (authEnabled ? Boolean(firebaseUser) && !initializing : !configError),
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
