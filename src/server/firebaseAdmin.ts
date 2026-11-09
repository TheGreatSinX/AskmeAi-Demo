import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, cert, applicationDefault, App, Credential } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

/** How the credentials were obtained — decides how a failed probe is handled. */
export type CredentialSource =
  /** FIREBASE_SERVICE_ACCOUNT / GOOGLE_APPLICATION_CREDENTIALS file: misconfig must fail fast. */
  | 'explicit'
  /** `gcloud auth application-default login` or an attached runtime service account. */
  | 'ambient'
  /**
   * No private key at all: ID tokens are still verified against Google's public
   * Secure Token certificates, but Firestore cannot be accessed, so data stays
   * in the local store until real credentials arrive.
   */
  | 'verify-only'
  /** Local auth/firestore emulators. */
  | 'emulator';

export interface FirebaseAdminContext {
  app: App;
  auth: Auth;
  firestore: Firestore;
  projectId: string;
  credentialSource: CredentialSource;
}

/**
 * Resolves the service account credentials used by firebase-admin.
 *
 * Accepted forms for FIREBASE_SERVICE_ACCOUNT:
 *   1. Raw JSON (single line, quotes escaped)      {"type":"service_account",...}
 *   2. Base64 encoded JSON                        eyJ0eXAiOiJKV1Qi...
 *   3. Path to a service account JSON file        ./serviceAccount.json
 *
 * If FIREBASE_SERVICE_ACCOUNT is absent, Application Default Credentials are
 * used (GOOGLE_APPLICATION_CREDENTIALS file, `gcloud auth application-default`,
 * or the attached service account on Cloud Run / GCE).
 */
function resolveCredential(): { credential: Credential; source: CredentialSource } | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();

  if (raw) {
    let json: string;
    if (raw.startsWith('{')) {
      json = raw;
    } else if (raw.startsWith('eyJ')) {
      json = Buffer.from(raw, 'base64').toString('utf-8');
    } else {
      const filePath = raw.replace(/^file:\/\//, '');
      if (!fs.existsSync(filePath)) {
        throw new Error(
          `FIREBASE_SERVICE_ACCOUNT points to "${filePath}" which does not exist.`
        );
      }
      json = fs.readFileSync(filePath, 'utf-8');
    }

    try {
      return { credential: cert(JSON.parse(json)), source: 'explicit' };
    } catch (err: any) {
      throw new Error(`Could not parse FIREBASE_SERVICE_ACCOUNT: ${err.message}`);
    }
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return { credential: applicationDefault(), source: 'explicit' };
  }

  // Running on Google infrastructure (Cloud Run / Functions / GAE) provides
  // ambient credentials, as does a locally cached `gcloud auth application-default login`.
  if (hasAmbientCredentials()) {
    return { credential: applicationDefault(), source: 'ambient' };
  }

  // No credentials at all: the caller falls back to verify-only mode when a
  // project id is known (ID tokens can be checked without a private key).
  return null;
}

/** True when a service account is provable from the environment alone. */
function hasAmbientCredentials(): boolean {
  if (process.env.K_SERVICE || process.env.FUNCTION_TARGET || process.env.GAE_ENV) {
    return true; // Cloud Run / Cloud Functions / App Engine
  }
  const gcloudDir =
    process.platform === 'win32'
      ? path.join(process.env.APPDATA || '', 'gcloud')
      : path.join(process.env.HOME || '', '.config', 'gcloud');
  return fs.existsSync(path.join(gcloudDir, 'application_default_credentials.json'));
}

/**
 * Initializes firebase-admin exactly once. Returns null when no Firebase
 * credentials are configured, which switches the server to its local
 * JSON-file store and demo (unauthenticated) mode.
 */
export function initFirebaseAdmin(): FirebaseAdminContext | null {
  try {
    let projectId =
      process.env.FIREBASE_PROJECT_ID ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT;

    if (!projectId && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        projectId = JSON.parse(
          fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf-8')
        ).project_id;
      } catch {
        /* resolveCredential() reports unreadable credential files */
      }
    }

    const isEmulator = Boolean(
      process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST
    );

    let credential: Credential | null = null;
    let credentialSource: CredentialSource = 'explicit';
    if (isEmulator) {
      // The emulators accept unauthenticated traffic: no service account needed.
      credentialSource = 'emulator';
      console.log(
        `[Firebase] Using local emulators (auth=${process.env.FIREBASE_AUTH_EMULATOR_HOST || 'off'}, ` +
          `firestore=${process.env.FIRESTORE_EMULATOR_HOST || 'off'})`
      );
    } else {
      const resolved = resolveCredential();
      if (resolved) {
        credential = resolved.credential;
        credentialSource = resolved.source;
      } else {
        // No private key anywhere: ID tokens can still be verified against
        // Google's public Secure Token certificates, which needs only the
        // project id. Firestore stays out of reach, so data remains local.
        credentialSource = 'verify-only';
      }
    }

    const resolvedProjectId =
      projectId ||
      (credentialSource === 'verify-only'
        ? process.env.VITE_FIREBASE_PROJECT_ID?.trim()
        : undefined) ||
      (isEmulator ? 'demo-askmeai' : undefined);

    if (!resolvedProjectId) {
      if (credentialSource === 'verify-only') {
        // Nothing to verify against: plain local demo mode.
        return null;
      }
      throw new Error(
        'FIREBASE_PROJECT_ID (or GOOGLE_APPLICATION_CREDENTIALS with a project_id) is required.'
      );
    }

    if (credentialSource === 'verify-only') {
      console.log(
        `[Firebase] No service account found — verifying ID tokens for project "${resolvedProjectId}" ` +
          'using Google public certificates. Auth is ON, data stays in the local store; add ' +
          'FIREBASE_SERVICE_ACCOUNT to .env to enable Firestore.'
      );
    }

    const isNewApp = getApps().length === 0;
    const app =
      getApps()[0] ??
      initializeApp(
        credential ? { credential, projectId: resolvedProjectId } : { projectId: resolvedProjectId }
      );

    const firestore = getFirestore(app);
    if (isNewApp) {
      // Optional fields (photoURL, resumeId, transcript category, ...) are
      // routinely absent; Firestore rejects `undefined` unless told otherwise.
      firestore.settings({ ignoreUndefinedProperties: true });
    }

    console.log(`[Firebase] firebase-admin initialized for project "${resolvedProjectId}"`);
    return {
      app,
      auth: getAuth(app),
      firestore,
      projectId: resolvedProjectId,
      credentialSource,
    };
  } catch (err: any) {
    // Fail fast: an explicitly configured-but-broken credential should not be
    // silently ignored (that would let requests through unauthenticated).
    console.error(`[Firebase] Failed to initialize firebase-admin: ${err.message}`);
    throw err;
  }
}
