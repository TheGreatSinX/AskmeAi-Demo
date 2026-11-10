/**
 * Minimal Cloud Firestore client over the REST API (v1), using only fetch and
 * WebCrypto (through jose). Runs on Cloudflare Workers, where firebase-admin's
 * gRPC transport is unavailable, and on Node.
 *
 * Authentication: a service account signs a JWT that is exchanged for an
 * OAuth access token (cached until shortly before it expires). Emulator mode
 * uses the "owner" token, which the emulator accepts as an admin.
 *
 * Like firebase-admin, the service account bypasses Firestore security rules.
 */
import { SignJWT, importPKCS8 } from 'jose';

export interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
}

export interface FirestoreRestOptions {
  projectId: string;
  /** Required unless emulatorHost is set. */
  serviceAccount?: ServiceAccount;
  /** e.g. "127.0.0.1:8080": talk to the local emulator instead of Google. */
  emulatorHost?: string;
}

export type WhereOp = 'EQUAL' | 'IN';
export interface Where {
  field: string;
  op: WhereOp;
  value: unknown;
}

/** A pending write inside a batch or transaction. */
type Write = Record<string, unknown>;

const SCOPE = 'https://www.googleapis.com/auth/datastore';
const MAX_TX_ATTEMPTS = 8;

// ── Value encoding ──────────────────────────────────────────────────────────

/** JS value -> Firestore Value. `undefined` fields are dropped (ignoreUndefinedProperties). */
export function encodeValue(value: unknown): Record<string, unknown> {
  if (value === null) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return { doubleValue: String(value) };
    return Number.isSafeInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.filter((v) => v !== undefined).map(encodeValue) } };
  }
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === 'object') return { mapValue: { fields: encodeFields(value as object) } };
  throw new Error(`Unsupported Firestore value type: ${typeof value}`);
}

export function encodeFields(obj: object): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(obj)) {
    if (v !== undefined) fields[key] = encodeValue(v);
  }
  return fields;
}

/** Firestore Value -> JS value. */
export function decodeValue(v: any): unknown {
  if (!v || typeof v !== 'object') return null;
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('referenceValue' in v) return v.referenceValue;
  if ('bytesValue' in v) return v.bytesValue;
  if ('geoPointValue' in v) return v.geoPointValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in v) return decodeFields(v.mapValue.fields || {});
  return null;
}

export function decodeFields(fields: Record<string, any>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(fields || {})) out[key] = decodeValue(v);
  return out;
}

/** Top-level field paths, quoted when they are not plain identifiers. */
function fieldPath(key: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? key : '`' + key.replace(/[`\\]/g, '\\$&') + '`';
}

export class FirestoreError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'FirestoreError';
  }
}

// ── Client ──────────────────────────────────────────────────────────────────

export class FirestoreRest {
  readonly projectId: string;
  private readonly root: string;
  private readonly docsRoot: string;
  private readonly sa?: ServiceAccount;
  private readonly emulator: boolean;
  private token: { value: string; expiresAt: number } | null = null;
  private pendingToken: Promise<string> | null = null;

  constructor(opts: FirestoreRestOptions) {
    this.projectId = opts.projectId;
    this.emulator = Boolean(opts.emulatorHost);
    if (!this.emulator && !opts.serviceAccount) {
      throw new Error('FirestoreRest needs a service account (or an emulator host).');
    }
    this.sa = opts.serviceAccount;
    const origin = this.emulator ? `http://${opts.emulatorHost}` : 'https://firestore.googleapis.com';
    this.docsRoot = `projects/${this.projectId}/databases/(default)/documents`;
    this.root = `${origin}/v1/${this.docsRoot}`;
  }

  docName(collection: string, id: string): string {
    return `${this.docsRoot}/${collection}/${id}`;
  }

  private docUrl(collection: string, id: string): string {
    return `${this.root}/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`;
  }

  // ── Auth ──
  private async accessToken(): Promise<string> {
    if (this.emulator) return 'owner';
    if (this.token && Date.now() < this.token.expiresAt) return this.token.value;
    if (!this.pendingToken) {
      this.pendingToken = this.fetchToken().finally(() => {
        this.pendingToken = null;
      });
    }
    return this.pendingToken;
  }

  private async fetchToken(): Promise<string> {
    const sa = this.sa!;
    const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token';
    const key = await importPKCS8(sa.private_key, 'RS256');
    const now = Math.floor(Date.now() / 1000);
    const assertion = await new SignJWT({ scope: SCOPE })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .setIssuer(sa.client_email)
      .setSubject(sa.client_email)
      .setAudience(tokenUri)
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(key);

    const res = await fetch(tokenUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok || !body.access_token) {
      // Never log the assertion or response tokens; the error code is enough.
      throw new FirestoreError(res.status, `Service account token exchange failed: ${body.error || res.status}`);
    }
    const ttl = Number(body.expires_in) || 3600;
    this.token = { value: body.access_token, expiresAt: Date.now() + (ttl - 120) * 1000 };
    return this.token.value;
  }

  private async call(url: string, init: RequestInit = {}): Promise<any> {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${await this.accessToken()}`);
    if (init.body) headers.set('Content-Type', 'application/json');
    const res = await fetch(url, { ...init, headers });
    if (res.status === 404) return undefined;
    const text = await res.text();
    const body = text ? JSON.parse(text) : {};
    if (!res.ok) {
      const message = body?.error?.message || `HTTP ${res.status}`;
      throw new FirestoreError(res.status, `Firestore ${body?.error?.status || res.status}: ${message}`);
    }
    return body;
  }

  // ── Reads ──
  async get<T = Record<string, unknown>>(collection: string, id: string, transaction?: string): Promise<T | undefined> {
    if (transaction) {
      // Transactional reads go through batchGet: the transaction id travels in
      // the JSON body (a GET ?transaction= read stalls on the emulator).
      const rows: any[] = (await this.call(`${this.root}:batchGet`, {
        method: 'POST',
        body: JSON.stringify({ documents: [this.docName(collection, id)], transaction }),
      })) || [];
      const found = rows.find((r) => r.found)?.found;
      return found ? (decodeFields(found.fields || {}) as T) : undefined;
    }
    const doc = await this.call(this.docUrl(collection, id));
    return doc ? (decodeFields(doc.fields || {}) as T) : undefined;
  }

  /** Equality / IN filters ANDed together. Results are unordered (sort in memory). */
  async query<T = Record<string, unknown>>(
    collection: string,
    where: Where[] = [],
    limit?: number
  ): Promise<{ id: string; data: T }[]> {
    const filters = where.map((w) => ({
      fieldFilter: {
        field: { fieldPath: fieldPath(w.field) },
        op: w.op,
        value: encodeValue(w.value),
      },
    }));
    const structuredQuery: Record<string, unknown> = { from: [{ collectionId: collection }] };
    if (filters.length === 1) structuredQuery.where = filters[0];
    if (filters.length > 1) structuredQuery.where = { compositeFilter: { op: 'AND', filters } };
    if (limit) structuredQuery.limit = limit;

    const rows: any[] = (await this.call(`${this.root}:runQuery`, {
      method: 'POST',
      body: JSON.stringify({ structuredQuery }),
    })) || [];
    return rows
      .filter((r) => r.document)
      .map((r) => ({
        id: String(r.document.name).split('/').pop()!,
        data: decodeFields(r.document.fields || {}) as T,
      }));
  }

  // ── Writes ──
  setWrite(collection: string, id: string, data: object, opts: { merge?: boolean } = {}): Write {
    const write: Write = { update: { name: this.docName(collection, id), fields: encodeFields(data) } };
    if (opts.merge) {
      write.updateMask = {
        fieldPaths: Object.keys(data)
          .filter((k) => (data as any)[k] !== undefined)
          .map(fieldPath),
      };
    }
    return write;
  }

  deleteWrite(collection: string, id: string): Write {
    return { delete: this.docName(collection, id) };
  }

  /** Atomically applies up to 500 writes (optionally inside a transaction). */
  async commit(writes: Write[], transaction?: string): Promise<void> {
    if (writes.length === 0 && !transaction) return;
    for (let i = 0; i < Math.max(writes.length, 1); i += 500) {
      const chunk = writes.slice(i, i + 500);
      const body: Record<string, unknown> = { writes: chunk };
      if (transaction) body.transaction = transaction;
      await this.call(`${this.root}:commit`, { method: 'POST', body: JSON.stringify(body) });
      if (transaction) break; // a transaction commits once
    }
  }

  set(collection: string, id: string, data: object, opts: { merge?: boolean } = {}): Promise<void> {
    return this.commit([this.setWrite(collection, id, data, opts)]);
  }

  delete(collection: string, id: string): Promise<void> {
    return this.commit([this.deleteWrite(collection, id)]);
  }

  /**
   * Read-modify-write with optimistic concurrency. `fn` reads through `tx.get`
   * and returns the writes to commit; retried when Firestore aborts on contention.
   */
  async runTransaction<R>(
    fn: (tx: { get: <T>(collection: string, id: string) => Promise<T | undefined> }) => Promise<{ writes: Write[]; result: R }>
  ): Promise<R> {
    let lastErr: unknown;
    let previous: string | undefined;
    for (let attempt = 0; attempt < MAX_TX_ATTEMPTS; attempt++) {
      if (attempt > 0) {
        // Exponential backoff with full jitter, so contending writers spread out.
        const cap = Math.min(2000, 100 * 2 ** attempt);
        await new Promise((r) => setTimeout(r, Math.random() * cap));
      }
      // retryTransaction lets Firestore give a retried transaction priority.
      const options = previous ? { readWrite: { retryTransaction: previous } } : { readWrite: {} };
      const begin = await this.call(`${this.root}:beginTransaction`, {
        method: 'POST',
        body: JSON.stringify({ options }),
      });
      const transaction: string = begin.transaction;
      previous = transaction;
      try {
        const { writes, result } = await fn({
          get: (collection, id) => this.get(collection, id, transaction),
        });
        await this.commit(writes, transaction);
        return result;
      } catch (err: any) {
        lastErr = err;
        const contended = err instanceof FirestoreError && (err.status === 409 || /ABORTED/.test(err.message));
        if (!contended) {
          await this.call(`${this.root}:rollback`, {
            method: 'POST',
            body: JSON.stringify({ transaction }),
          }).catch(() => undefined);
          throw err;
        }
      }
    }
    throw lastErr;
  }
}
