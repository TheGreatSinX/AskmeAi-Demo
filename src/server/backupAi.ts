/**
 * Backup AI provider — an OpenAI-compatible chat-completions endpoint that
 * serves requests when every Gemini key/model has failed (or when Gemini is
 * not configured at all).
 *
 * Configured entirely from the server environment:
 *   BACKUP_AI_URL     base url, e.g. https://api-cdn.deploy.com/api/v1
 *   BACKUP_AI_KEYS    comma-separated bearer tokens (rotated like Gemini's)
 *   BACKUP_AI_MODELS  comma-separated model ids, tried in order
 *
 * The router converts the Gemini-shaped `params` used across server.ts into an
 * OpenAI `messages` payload, rotates over keys and models, and returns the same
 * `{ text }` shape Gemini produces, so callers never know which provider
 * answered. Nothing here is ever sent to the browser or logged beyond the key
 * number.
 */

/** Shared result shape — callers in server.ts only read `.text`. */
export interface AiTextResult {
  text: string;
}

interface BackupKey {
  /** Zero-based position in BACKUP_AI_KEYS — logged instead of the secret. */
  index: number;
  secret: string;
  cooldownUntil: number;
  retired: boolean;
}

/** Statuses worth retrying, possibly on another key. */
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

/** Per-key pause after a quota error, unless Retry-After says otherwise. */
const DEFAULT_QUOTA_COOLDOWN_MS = 60_000;
/** Per-key pause after an overload (5xx) error. */
const OVERLOAD_COOLDOWN_MS = 3_000;
/**
 * Floor for a single attempt. GLM reasoning models can think for 10s+ before
 * their first token, so anything tighter cuts off healthy responses.
 */
const MIN_ATTEMPT_BUDGET_MS = 15_000;

const DEFAULT_BASE_URL = 'https://api-cdn.deploy.com/api/v1';
const DEFAULT_MODELS = ['zai-org/glm-5.3-flash', 'deepseek-ai/deepseek-v4.1-flash-1017'];
/**
 * Reasoning effort for the backup models. The default ("max") can spend the
 * entire completion budget thinking — measured at 27s and an empty answer —
 * while "low" answers in ~6s with no reasoning tokens. Set to "" to omit.
 */
const DEFAULT_REASONING_EFFORT = 'low';

function parseList(raw: string | undefined, fallback: string[] = []): string[] {
  if (!raw) return fallback;
  const items = raw
    .split(/[\s,;]+/)
    .map((v) => v.trim().replace(/^["']|["']$/g, ''))
    .filter((v) => v.length > 0 && v !== 'MY_BACKUP_AI_KEY');
  return items.length ? [...new Set(items)] : fallback;
}

/** Result of a single HTTP attempt — no exceptions, classification stays here. */
interface AttemptResult {
  status?: number;
  text?: string;
  error?: string;
  timedOut?: boolean;
}

/**
 * Converts Gemini request params into an OpenAI messages payload.
 * Returns null when the request cannot be expressed (PDF/other binary media),
 * in which case the caller simply lets Gemini handle it alone.
 */
function toOpenAiPayload(
  params: any
): { messages: any[]; maxCompletionTokens?: number } | null {
  const contents = params?.contents;
  let text = '';
  const images: string[] = [];
  let unsupportedMedia = false;

  const appendText = (value: string) => {
    text = text ? `${text}\n${value}` : value;
  };

  const consumeParts = (parts: any[]) => {
    for (const part of parts ?? []) {
      if (typeof part?.text === 'string') {
        appendText(part.text);
      } else if (part?.inlineData?.data) {
        const mime = part.inlineData.mimeType || 'application/octet-stream';
        if (mime.startsWith('image/')) {
          images.push(`data:${mime};base64,${part.inlineData.data}`);
        } else {
          unsupportedMedia = true; // PDFs etc. are Gemini-only here
        }
      } else if (part?.fileData?.fileUri) {
        unsupportedMedia = true;
      }
    }
  };

  if (typeof contents === 'string') {
    appendText(contents);
  } else if (Array.isArray(contents)) {
    for (const turn of contents) {
      if (typeof turn?.text === 'string') appendText(turn.text);
      else if (Array.isArray(turn?.parts)) consumeParts(turn.parts);
    }
  } else if (Array.isArray(contents?.parts)) {
    consumeParts(contents.parts);
  } else if (typeof contents?.text === 'string') {
    appendText(contents.text);
  }

  if (unsupportedMedia || !text.trim()) return null;

  const content: any = images.length
    ? [
        { type: 'text', text },
        ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
      ]
    : text;

  const maxCompletionTokens = params?.config?.maxOutputTokens;
  return {
    messages: [{ role: 'user', content }],
    ...(maxCompletionTokens ? { maxCompletionTokens } : {}),
  };
}

class BackupAiRouter {
  private keys: BackupKey[] = [];
  private cursor = 0;
  private baseUrl: string;
  private models: string[];
  private reasoningEffort: string | null;
  private warned = new Set<string>();

  constructor() {
    this.baseUrl = (process.env.BACKUP_AI_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.models = parseList(process.env.BACKUP_AI_MODELS, DEFAULT_MODELS);

    const effort = process.env.BACKUP_AI_REASONING_EFFORT;
    const resolvedEffort = (effort === undefined ? DEFAULT_REASONING_EFFORT : effort).trim();
    this.reasoningEffort = resolvedEffort || null;

    const raw = [process.env.BACKUP_AI_KEYS, process.env.BACKUP_AI_KEY]
      .filter(Boolean)
      .join(',');

    this.keys = parseList(raw).map((secret, index) => ({
      index,
      secret,
      cooldownUntil: 0,
      retired: false,
    }));

    if (this.keys.length > 0) {
      console.log(
        `[BackupAI] ${this.keys.length} key(s) loaded for ${new URL(this.baseUrl).host}, ` +
          `models: ${this.models.join(' → ')}`
      );
    }
  }

  get configured(): boolean {
    return this.keys.length > 0 && this.models.length > 0;
  }

  /** Round-robin over usable keys; falls back to the soonest-available key. */
  private pickKey(): BackupKey | null {
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
    return usable.reduce((a, b) => (a.cooldownUntil <= b.cooldownUntil ? a : b));
  }

  private coolDown(key: BackupKey, ms: number): void {
    key.cooldownUntil = Date.now() + ms;
  }

  private warnOnce(id: string, message: string): void {
    if (this.warned.has(id)) return;
    this.warned.add(id);
    console.warn(`[BackupAI] ${message}`);
  }

  /**
   * Calls the provider, rotating keys and models until success or budget expiry.
   * Resolves to `{ text }`, or null when nothing succeeded (callers then use
   * their built-in fallback content).
   */
  async generate(params: any, timeoutMs = 20_000): Promise<AiTextResult | null> {
    if (!this.configured) return null;

    const payload = toOpenAiPayload(params);
    if (!payload) {
      // Media this provider cannot read (e.g. a PDF resume): leave it to Gemini.
      return null;
    }

    const deadline = Date.now() + timeoutMs;

    for (const model of this.models) {
      if (Date.now() >= deadline) break;

      for (let attempt = 0; attempt < Math.max(2, this.keys.length); attempt++) {
        if (Date.now() >= deadline) break;

        const key = this.pickKey();
        if (!key) break;

        const budget = Math.min(
          deadline - Date.now(),
          Math.max(MIN_ATTEMPT_BUDGET_MS, Math.floor(timeoutMs / 2))
        );

        const result = await this.call(key, model, payload, budget);

        if (result.text) return { text: result.text };

        if (result.timedOut) {
          this.warnOnce(
            `timeout::${model}`,
            `${model} did not answer within ${Math.round(budget / 1000)}s; rotating.`
          );
          continue;
        }

        const status = result.status;

        if (status === 401 || status === 403) {
          key.retired = true;
          console.warn(`[BackupAI] Key #${key.index + 1} rejected (HTTP ${status}); retired.`);
          continue;
        }

        if (status === 429) {
          const retryAfter = Number(result.error?.match(/retry after (\d+)/i)?.[1]);
          const wait = Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : DEFAULT_QUOTA_COOLDOWN_MS;
          this.coolDown(key, wait);
          console.warn(
            `[BackupAI] Key #${key.index + 1} hit quota on ${model}; rotating in ${Math.round(wait / 1000)}s.`
          );
          continue;
        }

        if (status && RETRYABLE.has(status)) {
          this.coolDown(key, OVERLOAD_COOLDOWN_MS);
          this.warnOnce(
            `http-${status}::${model}`,
            `${model} temporarily unavailable (HTTP ${status}); rotating.`
          );
          continue;
        }

        if (status && status >= 400 && status < 500) {
          // Bad model id or malformed request: another key will not help.
          this.warnOnce(
            `reject-${status}::${model}`,
            `${model} rejected (HTTP ${status}): ${String(result.error).slice(0, 200)}`
          );
          break;
        }

        // Network failure: rotate to the next key.
        this.warnOnce(
          `network::${model}`,
          `${model} call failed: ${String(result.error).slice(0, 160)}`
        );
      }
    }

    return null;
  }

  private async call(
    key: BackupKey,
    model: string,
    payload: { messages: any[]; maxCompletionTokens?: number },
    budgetMs: number
  ): Promise<AttemptResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), budgetMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key.secret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: payload.messages,
          ...(this.reasoningEffort ? { reasoning_effort: this.reasoningEffort } : {}),
          ...(payload.maxCompletionTokens
            ? { max_completion_tokens: payload.maxCompletionTokens }
            : {}),
        }),
        signal: controller.signal,
      });

      const raw = await response.text();

      if (!response.ok) {
        let message = raw.slice(0, 300);
        try {
          const parsed = JSON.parse(raw);
          message = parsed?.error?.message || parsed?.message || message;
        } catch {
          /* keep the raw body */
        }
        return { status: response.status, error: message };
      }

      try {
        const parsed = JSON.parse(raw);
        const text = parsed?.choices?.[0]?.message?.content;
        if (typeof text === 'string' && text.trim()) return { text };
        return { status: response.status, error: 'empty completion' };
      } catch {
        return { status: response.status, error: 'unreadable response body' };
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        return { timedOut: true, error: `timed out after ${budgetMs}ms` };
      }
      return { error: String(err?.message || err) };
    } finally {
      clearTimeout(timer);
    }
  }
}

export const backupAi = new BackupAiRouter();
