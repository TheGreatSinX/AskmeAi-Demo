/**
 * The API layer (src/lib/api.ts) must attach the current Firebase ID token to
 * every request. The auth context registers its provider here on mount so that
 * api.ts stays independent of React.
 */
type TokenProvider = (forceRefresh?: boolean) => Promise<string | null>;

let provider: TokenProvider | null = null;

export function setTokenProvider(next: TokenProvider | null): void {
  provider = next;
}

export async function getAuthToken(): Promise<string | null> {
  if (!provider) return null;
  try {
    return await provider();
  } catch {
    return null;
  }
}

/** Forces a token refresh (used after a 401 response). */
export async function refreshAuthToken(): Promise<string | null> {
  if (!provider) return null;
  try {
    return await provider(true);
  } catch {
    return null;
  }
}
