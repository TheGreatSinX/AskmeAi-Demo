import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth, authEnabled } from '../lib/firebase';
import { setTokenProvider } from '../lib/authToken';

interface AuthContextType {
  /** VITE_FIREBASE_* configuration present in the browser bundle. */
  authEnabled: boolean;
  /** True while the initial Firebase session is being resolved. */
  initializing: boolean;
  firebaseUser: FirebaseUser | null;
  /** Misconfiguration detected at runtime (e.g. server requires auth we can't perform). */
  configError: string | null;
  setConfigError: (message: string | null) => void;
  /** True when the app may render its main shell (signed in, or running in demo mode). */
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  /** Sends a password-reset e-mail; throws a friendly message on failure. */
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function friendlyAuthError(err: any): string {
  const code = err?.code || '';
  const map: Record<string, string> = {
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/wrong-password': 'Incorrect email or password.',
    'auth/user-not-found': 'No account found for that email.',
    'auth/email-already-in-use': 'An account with that email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/missing-email': 'Please enter your email address.',
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
  const userRef = useRef<FirebaseUser | null>(null);

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

  // When the client is not configured for Firebase, ask the server whether it
  // still expects tokens (that combination means the build is missing keys).
  useEffect(() => {
    if (authEnabled) return;
    let cancelled = false;
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : null))
      .then((health) => {
        if (!cancelled && health?.authRequired) {
          setConfigError(
            'This server requires Firebase Auth, but this build has no VITE_FIREBASE_* configuration. ' +
              'Add the Firebase web config to .env and restart the dev server.'
          );
        }
      })
      .catch(() => {
        /* server not reachable yet; AppContext surfaces the sync error */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase Auth is not configured.');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      throw new Error(friendlyAuthError(err));
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    if (!auth) throw new Error('Firebase Auth is not configured.');
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (displayName.trim()) {
        await updateProfile(cred.user, { displayName: displayName.trim() });
        await cred.user.getIdToken(true);
      }
    } catch (err: any) {
      throw new Error(friendlyAuthError(err));
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!auth) throw new Error('Firebase Auth is not configured.');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err: any) {
      throw new Error(friendlyAuthError(err));
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    if (!auth) throw new Error('Firebase Auth is not configured.');
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      throw new Error(friendlyAuthError(err));
    }
  }, []);

  const signOut = useCallback(async () => {
    if (auth) await firebaseSignOut(auth);
  }, []);

  const value: AuthContextType = {
    authEnabled,
    initializing,
    firebaseUser,
    configError,
    setConfigError,
    ready: authEnabled ? Boolean(firebaseUser) && !initializing : !configError,
    signIn,
    signUp,
    signInWithGoogle,
    sendPasswordReset,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
