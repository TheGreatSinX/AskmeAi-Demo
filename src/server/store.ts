import { initFirebaseAdmin, FirebaseAdminContext } from './firebaseAdmin';
import { fileStore, DEMO_USER_ID } from './db';
import { FirestoreStore } from './firestoreStore';
import { DataStore } from './dataStore';

/**
 * Backend selection:
 *   1. DATA_BACKEND=file                -> force the local JSON store
 *   2. Firebase credentials configured  -> Firestore via firebase-admin,
 *      after a one-off reachability probe so a broken credential never selects
 *      a store that would fail every request
 *   3. otherwise                        -> local JSON store
 *
 * The store and auth are chosen independently: whenever firebase-admin can be
 * initialized (service account, ambient credentials, verify-only project id,
 * emulators) ID tokens are verified for real, even if the data has to stay in
 * the local JSON store because Firestore is unreachable.
 */
async function selectStore(): Promise<{ store: DataStore; admin: FirebaseAdminContext | null }> {
  const forceFile = process.env.DATA_BACKEND === 'file';

  let admin: FirebaseAdminContext | null = null;
  try {
    admin = initFirebaseAdmin();
  } catch (err: any) {
    if (forceFile) {
      console.warn(`[Store] Firebase init failed, continuing with local data only: ${err.message}`);
    } else {
      console.error(`[Store] ${err.message}`);
      process.exit(1);
    }
  }

  // Auth is independent of storage: initialize verification even when the data
  // is forced to stay local.
  if (forceFile) {
    console.log(
      `[Store] DATA_BACKEND=file -> local JSON store${admin ? ' (Firebase Auth still verifies ID tokens)' : ''}`
    );
    return { store: fileStore, admin };
  }

  if (admin) {
    // Verify-only: no private key, so Firestore is unreachable by definition.
    // Auth still works (public certificates), data stays in the local store.
    if (admin.credentialSource === 'verify-only') {
      console.warn(
        '[Store] No Firestore credentials — keeping data in the local JSON store while Firebase ' +
          'Auth verifies real ID tokens. Add FIREBASE_SERVICE_ACCOUNT to .env to switch to Firestore.'
      );
      return { store: fileStore, admin };
    }

    if (await probeFirestore(admin)) {
      return { store: new FirestoreStore(admin), admin };
    }

    if (mustReachFirestore(admin)) {
      console.error(
        `[Store] Firestore for project "${admin.projectId}" is not reachable with the ` +
          `${admin.credentialSource} credentials, and this configuration must not fall back ` +
          'to local storage. Fix FIREBASE_SERVICE_ACCOUNT / project access, or set ' +
          'DATA_BACKEND=file to run explicitly in local mode.'
      );
      process.exit(1);
    }

    // Keep the admin context: ID tokens still verify, only the data is local.
    // Discarding it here would force every request into unauthenticated demo
    // mode while the browser happily signs users in.
    console.warn(
      `[Store] Firebase project "${admin.projectId}" is not reachable with this machine's ` +
        'Application Default Credentials (account has no access, or the Firestore database ' +
        'has not been created yet). Data stays in the local JSON store while Firebase Auth ' +
        'verifies real ID tokens. Add FIREBASE_SERVICE_ACCOUNT to .env to enable Firestore.'
    );
    return { store: fileStore, admin };
  }

  console.warn(
    '[Store] No Firebase credentials found -> using local JSON store (data/database.json). ' +
      'Set FIREBASE_SERVICE_ACCOUNT (or GOOGLE_APPLICATION_CREDENTIALS) to enable Firestore.'
  );
  return { store: fileStore, admin: null };
}

/** True when a Firestore outage must abort instead of degrading to demo mode. */
function mustReachFirestore(admin: FirebaseAdminContext): boolean {
  if (admin.credentialSource !== 'ambient') return true; // explicit file or emulators
  // On Google infra the service account is provisioned for this project, so an
  // unreachable Firestore means a real misconfiguration, not a dev laptop.
  return Boolean(process.env.K_SERVICE || process.env.FUNCTION_TARGET || process.env.GAE_ENV);
}

/**
 * One cheap read against Firestore. Resolves false on permission errors, a
 * missing database, or a timeout — all of which would break every API route.
 */
async function probeFirestore(admin: FirebaseAdminContext): Promise<boolean> {
  const PROBE_TIMEOUT_MS = 6000;

  const read = admin.firestore
    .collection('_connectivity_probe')
    .limit(1)
    .get()
    .then(
      () => true,
      () => false
    );
  const timeout = new Promise<false>((resolve) =>
    setTimeout(() => resolve(false), PROBE_TIMEOUT_MS)
  );

  const reachable = await Promise.race([read, timeout]);
  return reachable;
}

// Top-level await: server.ts imports this module first, so every route sees the
// fully selected store.
const selected = await selectStore();

/** The active persistence layer. */
export const db: DataStore = selected.store;

/** firebase-admin context, or null when ID token verification is impossible. */
export const firebaseAdmin: FirebaseAdminContext | null = selected.admin;

/** True when the server verifies real Firebase ID tokens (project id is enough). */
export const authEnabled = Boolean(selected.admin);

/** Fallback uid used only in local demo mode (no Firebase credentials). */
export const DEMO_FALLBACK_UID = DEMO_USER_ID;
