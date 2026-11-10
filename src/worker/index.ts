/**
 * Cloudflare Worker entry: production for askmeai.thegreatsinx.workers.dev.
 *
 * Static files (dist/) are served by Workers static assets without running
 * this code; only /api/* reaches it (wrangler.jsonc: run_worker_first). The
 * Express API from src/server/app.ts runs here through Workers' node:http
 * support. Firestore is reached over REST with the service account in the
 * FIREBASE_SERVICE_ACCOUNT secret; ID tokens are verified with jose.
 *
 * Secrets and vars arrive in process.env (nodejs_compat_populate_process_env).
 */
import { httpServerHandler } from 'cloudflare:node';
import { configureApp, describeRuntime } from '../server/app';
import { FirestoreRest, type ServiceAccount } from '../server/firestoreRest';
import { FirestoreRestStore } from '../server/firestoreRestStore';
import { createIdTokenVerifier } from '../server/idToken';
import { PUBLIC_FIREBASE_PROJECT_ID } from '../lib/firebaseProject';
import type { DataStore } from '../server/dataStore';

const env = process.env;
const projectId = env.FIREBASE_PROJECT_ID?.trim() || PUBLIC_FIREBASE_PROJECT_ID;
const authEmulatorHost = env.FIREBASE_AUTH_EMULATOR_HOST?.trim() || undefined;
const firestoreEmulatorHost = env.FIRESTORE_EMULATOR_HOST?.trim() || undefined;

function parseServiceAccount(raw: string | undefined): ServiceAccount | undefined {
  if (!raw?.trim()) return undefined;
  const text = raw.trim().startsWith('{') ? raw.trim() : atob(raw.trim()); // raw JSON or base64
  const sa = JSON.parse(text);
  if (sa.type !== 'service_account' || !sa.client_email || !sa.private_key) {
    throw new Error('not a service account key');
  }
  if (sa.project_id !== projectId) {
    throw new Error(`service account is for "${sa.project_id}", expected "${projectId}"`);
  }
  return sa;
}

let configError: string | undefined;
let store: DataStore;
try {
  const serviceAccount = firestoreEmulatorHost ? undefined : parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  if (!serviceAccount && !firestoreEmulatorHost) {
    throw new Error('the FIREBASE_SERVICE_ACCOUNT secret is not set');
  }
  store = new FirestoreRestStore(new FirestoreRest({ projectId, serviceAccount, emulatorHost: firestoreEmulatorHost }), {
    // Comma-separated owner emails (secret). Only these can become super_admin.
    bootstrapAdminEmails: (env.ADMIN_EMAILS || '').split(','),
  });
} catch (err: any) {
  configError = `Firestore credentials are unusable (${err?.message || err}).`;
  console.error(`[AskMeAi] ${configError}`);
  // Placeholder so /api/health still answers; attachAuth refuses everything else.
  store = { kind: 'firestore' } as DataStore;
}

const app = configureApp({
  db: store,
  verifyIdToken: createIdTokenVerifier(projectId, { emulatorHost: authEmulatorHost }),
  configError,
  behindCloudflare: true,
});

app.listen(3000);
console.log(`[AskMeAi] Worker ready for project "${projectId}". ${describeRuntime()}`);

export default httpServerHandler({ port: 3000 });
