import { createPublicKey, verify as cryptoVerify } from 'node:crypto';

// Telegram's OIDC endpoints, per https://core.telegram.org/widgets/login.
const TELEGRAM_ISSUER = 'https://oauth.telegram.org';
const JWKS_URI = `${TELEGRAM_ISSUER}/.well-known/jwks.json`;

// Claims we rely on from the id_token (scope: openid profile). `id` is the
// Telegram user id used as our whitelist key; `sub` is a separate opaque id.
export interface TelegramIdTokenClaims {
  iss: string;
  // Telegram's client_id is numeric, so `aud` may arrive as a JSON number.
  aud: string | number | Array<string | number>;
  sub: string;
  exp: number;
  iat: number;
  id: number;
  name?: string;
  preferred_username?: string;
  picture?: string;
}

// Matches node:crypto's JsonWebKey (which carries a string index signature),
// with `kid` required so we can select the right key from the JWKS.
type Jwk = { kid: string; kty: string; [key: string]: unknown };

// In-memory JWKS cache. Telegram rotates keys rarely, so we cache the key set
// and only refetch when a token references a `kid` we haven't seen yet.
let jwksCache: Jwk[] | null = null;

async function fetchJwks(forceRefresh = false): Promise<Jwk[]> {
  if (!jwksCache || forceRefresh) {
    const res = await fetch(JWKS_URI);
    if (!res.ok) {
      throw new Error(`JWKS fetch failed with status ${res.status}`);
    }
    const data = (await res.json()) as { keys: Jwk[] };
    jwksCache = data.keys;
  }
  return jwksCache;
}

async function findSigningKey(kid: string): Promise<Jwk> {
  let key = (await fetchJwks()).find((k) => k.kid === kid);
  if (!key) {
    // Cache miss — the key may have been rotated in; refetch once.
    key = (await fetchJwks(true)).find((k) => k.kid === kid);
  }
  if (!key) {
    throw new Error(`No JWKS key matches kid "${kid}"`);
  }
  return key;
}

// Verify a Telegram id_token: RS256 signature against the JWKS, plus the
// issuer, audience and expiry claims. Returns the decoded claims on success.
export async function verifyIdToken(
  idToken: string,
  expectedAudience: string,
): Promise<TelegramIdTokenClaims> {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed id_token');
  }
  const [headerB64, payloadB64, signatureB64] = parts;

  const header = JSON.parse(
    Buffer.from(headerB64, 'base64url').toString('utf8'),
  ) as { alg: string; kid: string };
  if (header.alg !== 'RS256') {
    throw new Error(`Unsupported id_token alg "${header.alg}"`);
  }

  const jwk = await findSigningKey(header.kid);
  const publicKey = createPublicKey({ key: jwk, format: 'jwk' });
  const signatureValid = cryptoVerify(
    'RSA-SHA256',
    Buffer.from(`${headerB64}.${payloadB64}`),
    publicKey,
    Buffer.from(signatureB64, 'base64url'),
  );
  if (!signatureValid) {
    throw new Error('Invalid id_token signature');
  }

  const claims = JSON.parse(
    Buffer.from(payloadB64, 'base64url').toString('utf8'),
  ) as TelegramIdTokenClaims;

  if (claims.iss !== TELEGRAM_ISSUER) {
    throw new Error('Invalid id_token issuer');
  }
  // Compare as strings: expectedAudience always comes from process.env, while
  // the claim may be a number — a strict === would then never match.
  const expected = String(expectedAudience);
  const audienceOk = Array.isArray(claims.aud)
    ? claims.aud.some((a) => String(a) === expected)
    : String(claims.aud) === expected;
  if (!audienceOk) {
    throw new Error(
      `Invalid id_token audience: got ${JSON.stringify(claims.aud)}, expected ${expected}`,
    );
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== 'number' || claims.exp < nowSeconds) {
    throw new Error('id_token has expired');
  }
  if (typeof claims.id !== 'number') {
    throw new Error('id_token is missing the Telegram user id');
  }

  return claims;
}
