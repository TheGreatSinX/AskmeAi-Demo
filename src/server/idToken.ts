/**
 * Firebase ID token verification with jose (WebCrypto), for runtimes where
 * firebase-admin cannot run (Cloudflare Workers). Applies the checks that
 * firebase-admin's verifyIdToken() applies:
 * https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
 *
 *   alg RS256, kid from Google's securetoken keys, iss/aud = project,
 *   exp in the future, iat and auth_time in the past, non-empty sub.
 */
import { createRemoteJWKSet, jwtVerify, decodeJwt } from 'jose';
import type { VerifiedIdToken } from './app';

const SECURETOKEN_JWKS = new URL(
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
);

/** Clock skew tolerated on exp/iat, in seconds. */
const CLOCK_TOLERANCE = 30;

export function createIdTokenVerifier(
  projectId: string,
  opts: { emulatorHost?: string } = {}
): (token: string) => Promise<VerifiedIdToken> {
  if (!projectId) throw new Error('createIdTokenVerifier: projectId is required');

  // Auth emulator tokens are unsigned (alg "none"). Accepted ONLY when an
  // emulator host is configured, exactly like firebase-admin. Production never
  // sets FIREBASE_AUTH_EMULATOR_HOST.
  if (opts.emulatorHost) {
    return async (token) => toClaims(checkClaims(decodeJwt(token), projectId));
  }

  const jwks = createRemoteJWKSet(SECURETOKEN_JWKS, { cacheMaxAge: 6 * 60 * 60 * 1000 });
  return async (token) => {
    const { payload } = await jwtVerify(token, jwks, {
      algorithms: ['RS256'],
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      clockTolerance: CLOCK_TOLERANCE,
    });
    return toClaims(checkClaims(payload, projectId));
  };
}

function checkClaims(p: Record<string, any>, projectId: string): Record<string, any> {
  const now = Math.floor(Date.now() / 1000);
  if (p.aud !== projectId) throw new Error('ID token has the wrong audience');
  if (p.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('ID token has the wrong issuer');
  if (typeof p.sub !== 'string' || !p.sub || p.sub.length > 128) throw new Error('ID token has no valid subject');
  if (typeof p.exp !== 'number' || p.exp + CLOCK_TOLERANCE < now) throw new Error('ID token has expired');
  if (typeof p.iat === 'number' && p.iat - CLOCK_TOLERANCE > now) throw new Error('ID token issued in the future');
  if (typeof p.auth_time === 'number' && p.auth_time - CLOCK_TOLERANCE > now) {
    throw new Error('ID token auth_time is in the future');
  }
  return p;
}

function toClaims(p: Record<string, any>): VerifiedIdToken {
  return {
    uid: p.sub,
    email: typeof p.email === 'string' ? p.email : undefined,
    name: typeof p.name === 'string' ? p.name : undefined,
    picture: typeof p.picture === 'string' ? p.picture : undefined,
    email_verified: p.email_verified === true,
  };
}
