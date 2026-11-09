import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';

const env = import.meta.env;

/**
 * PUBLIC Firebase web configuration.
 *
 * These values identify the Firebase project to the browser — they are the
 * standard client-side config that every Firebase web app ships in its
 * bundle by design (Firebase docs: "the Firebase web config is safe to
 * expose in client-side code"). They grant no access on their own: Firestore
 * security rules and App Check decide what a client may do.
 *
 * They are NOT server credentials. Gemini keys, backup-provider keys and
 * firebase-admin credentials never leave the server (.env, git-ignored).
 *
 * `VITE_FIREBASE_*` environment variables override these defaults, so a
 * different deployment (fork, staging) can point elsewhere without editing
 * source. Keeping the defaults committed is what lets the static Cloudflare
 * deploy show a working Google sign-in instead of silently skipping auth.
 */
const PUBLIC_WEB_CONFIG = {
  apiKey: 'AIzaSyBE2_HbiZIijisvntgAlXxzmm3xbdzZ9JI',
  authDomain: 'socintel-111625-35761285-e248d.firebaseapp.com',
  projectId: 'socintel-111625-35761285-e248d',
  storageBucket: 'socintel-111625-35761285-e248d.firebasestorage.app',
  messagingSenderId: '864515612488',
  appId: '1:864515612488:web:fe3b243abbfd7dc59c5d7d',
};

export const firebaseConfig = {
  apiKey: (env.VITE_FIREBASE_API_KEY as string | undefined) || PUBLIC_WEB_CONFIG.apiKey,
  authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) || PUBLIC_WEB_CONFIG.authDomain,
  projectId: (env.VITE_FIREBASE_PROJECT_ID as string | undefined) || PUBLIC_WEB_CONFIG.projectId,
  storageBucket:
    (env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined) || PUBLIC_WEB_CONFIG.storageBucket,
  messagingSenderId:
    (env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined) || PUBLIC_WEB_CONFIG.messagingSenderId,
  appId: (env.VITE_FIREBASE_APP_ID as string | undefined) || PUBLIC_WEB_CONFIG.appId,
};

/**
 * Firebase Auth is optional only in the degenerate case where even the
 * public config is missing (stripped build). With the committed defaults
 * this is true on every deployment, so the Google sign-in gate is active
 * everywhere — including the static Cloudflare site.
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
