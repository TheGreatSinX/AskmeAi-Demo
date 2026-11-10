/**
 * The Firebase project the browser bundle signs users in to by default.
 *
 * Shared by the client (src/lib/firebase.ts) and the server (firebase-admin,
 * CSP), so the server always verifies ID tokens against the same project the
 * browser issues them from. This file must stay free of `import.meta.env` and
 * `process.env` so both runtimes can import it.
 *
 * `VITE_FIREBASE_PROJECT_ID` / `VITE_FIREBASE_AUTH_DOMAIN` override these on
 * both sides.
 */
export const PUBLIC_FIREBASE_PROJECT_ID = 'socintel-111625-35761285-e248d';
export const PUBLIC_FIREBASE_AUTH_DOMAIN = `${PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`;
