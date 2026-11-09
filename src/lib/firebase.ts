import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';

const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
};

/**
 * Firebase Auth is optional: without VITE_FIREBASE_* variables the app runs in
 * local demo mode against the seeded developer account.
 */
export const authEnabled = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId
);

/** Set to "localhost:9099" to point the client at the local Auth emulator. */
const authEmulatorHost = env.VITE_FIREBASE_AUTH_EMULATOR_HOST as string | undefined;

let app: FirebaseApp | null = null;

export const auth: Auth | null = authEnabled
  ? (() => {
      app = getApps()[0] ?? initializeApp(firebaseConfig as Record<string, string>);
      const instance = getAuth(app);
      if (authEmulatorHost) {
        connectAuthEmulator(instance, `http://${authEmulatorHost}`, { disableWarnings: true });
      }
      return instance;
    })()
  : null;

export const firebaseApp = app;
