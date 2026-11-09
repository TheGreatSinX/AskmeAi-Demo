import { GoogleGenAI } from '@google/genai';

/**
 * Multi-key Gemini router.
 *
 * Several API keys are configured (GEMINI_API_KEYS) and requests rotate across
 * them. When one key hits a quota (429) or an overloaded backend (503), it is
 * cooled down and the next key immediately takes over; keys rejected as
 * unauthorized (401/403) are retired for the lifetime of the process.
 *
 * If every key keeps failing for the requested model, the router falls back
 * through GEMINI_MODEL_FALLBACKS so a single saturated model never leaves the
 * product without AI.
 *
 * Keys are read from the server environment only — they are never sent to the
 * browser, never logged (only the key index is logged) and never persisted.
 */

interface KeyState {
  /** Zero-based position in GEMINI_API_KEYS — used for logging instead of the key. */
  index: number;
  client: GoogleGenAI;
  /** Epoch ms until which this key must not be used. */
  cooldownUntil: number;
  /** True when the key itself was rejected (401/403). */
  retired: boolean;
}

/** Statuses worth retrying, possibly on another key. */
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

/** Per-key pause after a quota error, unless the API tells us how long to wait. */
const DEFAULT_QUOTA_COOLDOWN_MS = 60_000;
/** Per-key pause after an overload (5xx) error — these clear quickly. */
const OVERLOAD_COOLDOWN_MS = 3_000;
/** Per-model pause after a timeout: the model hangs, every key would too. */
const HANG_COOLDOWN_MS = 60_000;
/** Per-model pause after a hard 4xx (unknown model id, retired model, ...). */
const REJECTED_MODEL_COOLDOWN_MS = 5 * 60_000;
/**
 * Floor for a single attempt. Under normal load a flash model needs 6-14s to
 * answer a real prompt, so anything tighter parks healthy models.
 */
const MIN_ATTEMPT_BUDGET_MS = 15_000;
/** Default overall budget when a caller does not pass one. */
const DEFAULT_TIMEOUT_MS = 30_000;

function parseKeyList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[\s,;]+/)
    .map((k) => k.trim().replace(/^["']|["']$/g, ''))
    .filter((k) => k.length > 0 && k !== 'MY_GEMINI_API_KEY');
}

function parseModelList(raw: string | undefined, fallback: string[]): string[] {
  const configured = parseKeyList(raw);
  return [...new Set([...(configured.length ? configured : fallback)])];
}

/**
 * Model used when a caller does not pick one, and the first model tried.
 * gemini-3.7/3.8-flash currently hang or answer 503 under load, so the
 * default is a model verified to answer in seconds; override with GEMINI_MODEL.
 */
export const PRIMARY_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash';

/** Reads "retryDelay": "35s" / "5000ms" style hints out of API error messages. */
function retryDelayMs(message: string | undefined): number | null {
  if (!message) return null;
  const match = message.match(/retry(?:Delay)?"?\s*[:=]?\s*"?(\d+)(s|ms)/i);
  if (!match) return null;
  const value = Number(match[1]);
  return match[2].toLowerCase() === 'ms' ? value : value * 1000;
}

class GeminiRouter {
  private keys: KeyState[] = [];
  private cursor = 0;
  private fallbackModels: string[];
  private warnedModels = new Set<string>();
  /** Model id -> epoch ms until that model must not be tried. */
  private modelCooldown = new Map<string, number>();

  constructor() {
    const raw = [process.env.GEMINI_API_KEYS, process.env.GEMINI_API_KEY]
      .filter(Boolean)
      .join(',');

    this.keys = parseKeyList(raw).map((key, index) => ({
      index,
      client: new GoogleGenAI({
        apiKey: key,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      }),
      cooldownUntil: 0,
      retired: false,
    }));

    this.fallbackModels = parseModelList(process.env.GEMINI_MODEL_FALLBACKS, [
      'gemini-3.5-flash',
      'gemini-3.6-flash',
    ]);

    if (this.keys.length === 0) {
      console.warn('[Gemini] No API key configured (GEMINI_API_KEYS) — AI features use built-in fallbacks.');
    } else {
      console.log(
        `[Gemini] ${this.keys.length} API key(s) loaded with automatic quota rotation, ` +
          `primary model: ${PRIMARY_MODEL}` +
          (this.fallbackModels.length ? `, model fallbacks: ${this.fallbackModels.join(' → ')}` : '')
      );
    }
  }

  get configured(): boolean {
    return this.keys.length > 0;
  }

  get keyCount(): number {
    return this.keys.filter((k) => !k.retired).length;
  }

  /** Round-robin over usable keys; falls back to the soonest-available key. */
  private pickKey(): KeyState | null {
    const now = Date.now();
    const usable = this.keys.filter((k) => !k.retired);
    if (usable.length === 0) return null;

    for (let i = 0; i < usable.length; i++) {
      const key = usable[(this.cursor + i) % usable.length];
      if (key.cooldownUntil <= now) {
        this.cursor = (this.cursor + i + 1) % usable.length;
        return key;
      }
    }

    // Every key is cooling down: use whichever recovers first rather than fail.
    return usable.reduce((a, b) => (a.cooldownUntil <= b.cooldownUntil ? a : b));
  }

  private coolDown(key: KeyState, ms: number): void {
    key.cooldownUntil = Date.now() + ms;
  }

  private coolModel(model: string, ms: number): void {
    const until = Date.now() + ms;
    if ((this.modelCooldown.get(model) ?? 0) < until) {
      this.modelCooldown.set(model, until);
    }
  }

  /** Warns once per model+reason so a flapping model cannot flood the logs. */
  private warnOnce(model: string, reason: string, message: string): void {
    const id = `${model}::${reason}`;
    if (this.warnedModels.has(id)) return;
    this.warnedModels.add(id);
    console.warn(`[Gemini] ${message}`);
  }

  /**
   * Models to try, hottest first: the requested one, then the fallback pool,
   * skipping anything currently cooled down. When every candidate is cooling,
   * the one recovering soonest is tried anyway rather than failing outright.
   */
  private orderModels(requested: string): string[] {
    const all = [requested, ...this.fallbackModels.filter((m) => m !== requested)];
    const now = Date.now();
    const available = all.filter((m) => (this.modelCooldown.get(m) ?? 0) <= now);
    if (available.length > 0) return available;

    const soonest = all.reduce((a, b) =>
      (this.modelCooldown.get(a) ?? 0) <= (this.modelCooldown.get(b) ?? 0) ? a : b
    );
    return [soonest];
  }

  private describe(err: any): { status?: number; message: string; timedOut: boolean } {
    const status = typeof err?.status === 'number' ? err.status : undefined;
    const message = String(err?.message || err || 'unknown error');
    return { status, message, timedOut: /timed out/i.test(message) };
  }

  /**
   * Calls generateContent, rotating keys/models until success or budget expiry.
   * Resolves to the API response, or null when nothing succeeded (callers treat
   * null as "use the built-in fallback").
   *
   * Failure handling, because the two axes fail independently:
   *   429 (key quota)  -> cool the key, the next key takes over
   *   503/5xx (model)  -> cool the model, the next model takes over
   *   timeout (model)  -> cool the model for a minute, the next model takes over
   *   401/403 (key)    -> retire the key for the process lifetime
   *   4xx (model id)   -> cool the model for 5 minutes (retired/unknown model)
   */
  async generate(params: any, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<any> {
    if (!this.configured) return null;

    const deadline = Date.now() + timeoutMs;
    const requestedModel = params?.model || PRIMARY_MODEL;

    for (const model of this.orderModels(requestedModel)) {
      if (Date.now() >= deadline) break;

      // A few rotations per model before moving to the next one.
      for (let attempt = 0; attempt < Math.max(2, this.keys.length); attempt++) {
        if (Date.now() >= deadline) break;

        const key = this.pickKey();
        if (!key) break;

        const remaining = deadline - Date.now();
        const attemptBudget = Math.min(
          remaining,
          Math.max(MIN_ATTEMPT_BUDGET_MS, Math.floor(timeoutMs / 3))
        );

        try {
          return await this.callWithTimeout(
            key.client.models.generateContent({ ...params, model }),
            attemptBudget
          );
        } catch (err) {
          const { status, message, timedOut } = this.describe(err);

          if (status === 401 || status === 403) {
            key.retired = true;
            console.warn(`[Gemini] Key #${key.index + 1} rejected (HTTP ${status}); retired.`);
            continue;
          }

          if (status === 429) {
            const wait = retryDelayMs(message) ?? DEFAULT_QUOTA_COOLDOWN_MS;
            this.coolDown(key, wait);
            console.warn(
              `[Gemini] Key #${key.index + 1} hit quota on ${model}; rotating in ${Math.round(wait / 1000)}s.`
            );
            continue;
          }

          if (timedOut) {
            // Every key would hang on the same model: park the model, not the key.
            this.coolModel(model, HANG_COOLDOWN_MS);
            this.warnOnce(
              model,
              'hang',
              `${model} did not answer within ${Math.round(attemptBudget / 1000)}s; ` +
                `parking it for ${Math.round(HANG_COOLDOWN_MS / 60000)}min.`
            );
            break;
          }

          if (status && RETRYABLE.has(status)) {
            // Model-side overload: another key would see the same backend.
            this.coolModel(model, OVERLOAD_COOLDOWN_MS);
            this.warnOnce(
              model,
              `http-${status}`,
              `${model} temporarily unavailable (HTTP ${status}); trying the next model.`
            );
            break;
          }

          // 4xx that is not retryable: rotating keys will not help (retired or
          // unknown model id, malformed request, ...). Give up on this model.
          if (status && status >= 400 && status < 500) {
            this.coolModel(model, REJECTED_MODEL_COOLDOWN_MS);
            this.warnOnce(
              model,
              `reject-${status}`,
              `${model} rejected (HTTP ${status}): ${message.slice(0, 200)}`
            );
            break;
          }

          // Network error: the key may be fine, so just rotate.
          this.warnOnce(model, 'network', `${model} call failed: ${message.slice(0, 160)}`);
        }
      }

      if (model !== requestedModel) {
        console.warn(`[Gemini] Falling back to ${model} for this request.`);
      }
    }

    return null;
  }

  private callWithTimeout(promise: Promise<any>, ms: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Gemini call timed out after ${ms}ms`)), ms);
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        }
      );
    });
  }
}

export const gemini = new GeminiRouter();
