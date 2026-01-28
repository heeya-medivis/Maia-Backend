import * as crypto from 'crypto';
import { SignJWT, jwtVerify, importPKCS8, importSPKI, exportJWK } from 'jose';
import { ConfigService } from '@nestjs/config';

import type { JWK } from 'jose';

const ALGORITHM = 'RS256';

// Key cache
let privateKeyPromise: ReturnType<typeof importPKCS8> | null = null;
let publicKeyPromise: ReturnType<typeof importSPKI> | null = null;
let configServiceRef: ConfigService | null = null;

/**
 * Initialize JWT utilities with config service
 * Must be called before using any JWT functions
 */
export function initializeJwt(configService: ConfigService): void {
  configServiceRef = configService;
}

const getPrivateKey = (): ReturnType<typeof importPKCS8> => {
  if (!configServiceRef) throw new Error('JWT not initialized. Call initializeJwt first.');
  if (!privateKeyPromise) {
    const key = configServiceRef.getOrThrow<string>('JWT_PRIVATE_KEY');
    privateKeyPromise = importPKCS8(key, ALGORITHM);
  }
  return privateKeyPromise;
};

const getPublicKey = (): ReturnType<typeof importSPKI> => {
  if (!configServiceRef) throw new Error('JWT not initialized. Call initializeJwt first.');
  if (!publicKeyPromise) {
    const key = configServiceRef.getOrThrow<string>('JWT_PUBLIC_KEY');
    publicKeyPromise = importSPKI(key, ALGORITHM);
  }
  return publicKeyPromise;
};

export interface AccessTokenClaims {
  sub: string;          // User ID
  sid: string;          // Session ID
  did?: string;         // Device ID
  email?: string;
  name?: string;
  roles?: string[];
  amr?: string[];       // Authentication methods used
}

/**
 * Sign an access token with RS256
 */
export const signAccessToken = async (claims: AccessTokenClaims): Promise<string> => {
  if (!configServiceRef) throw new Error('JWT not initialized');
  
  const now = Math.floor(Date.now() / 1000);
  const ttl = configServiceRef.get<number>('ACCESS_TOKEN_TTL_SECONDS', 600);
  const exp = now + ttl;

  const key = await getPrivateKey();
  const keyId = configServiceRef.getOrThrow<string>('JWT_KEY_ID');
  const issuer = configServiceRef.get<string>('JWT_ISSUER', 'maia.surgicalar.com');
  const audience = configServiceRef.get<string>('JWT_AUDIENCE', 'maia-api');

  return await new SignJWT({
    ...claims,
    iat: now,
    exp,
    iss: issuer,
    aud: audience,
  })
    .setProtectedHeader({ alg: ALGORITHM, typ: 'JWT', kid: keyId })
    .sign(key);
};

/**
 * Verify an access token and return claims
 */
export const verifyAccessToken = async (token: string): Promise<AccessTokenClaims> => {
  if (!configServiceRef) throw new Error('JWT not initialized');
  
  const key = await getPublicKey();
  const issuer = configServiceRef.get<string>('JWT_ISSUER', 'maia.surgicalar.com');
  const audience = configServiceRef.get<string>('JWT_AUDIENCE', 'maia-api');
  
  const { payload } = await jwtVerify(token, key, {
    issuer,
    audience,
  });

  return payload as unknown as AccessTokenClaims;
};

/**
 * Get JWKS (JSON Web Key Set) for public key distribution
 * This endpoint allows clients to verify JWTs without having the public key beforehand
 */
export const getJwks = async (): Promise<{ keys: JWK[] }> => {
  if (!configServiceRef) throw new Error('JWT not initialized');
  
  const publicKey = await getPublicKey();
  const keyId = configServiceRef.getOrThrow<string>('JWT_KEY_ID');

  // Export the public key as JWK
  const jwk = await exportJWK(publicKey);

  return {
    keys: [
      {
        ...jwk,
        kid: keyId,
        alg: ALGORITHM,
        use: 'sig',
      },
    ],
  };
};

// =============================================================================
// Refresh Token Utilities (HMAC-signed, not JWT)
// =============================================================================

/**
 * Generate an HMAC-signed refresh token
 * Format: base64url(sessionId.familyId).signature
 */
export const generateRefreshToken = (sessionId: string, familyId: string): string => {
  if (!configServiceRef) throw new Error('JWT not initialized');
  
  const secret = configServiceRef.get<string>('REFRESH_TOKEN_SECRET') 
    ?? configServiceRef.getOrThrow<string>('AUTH_STATE_SECRET');
  
  const payload = Buffer.from(`${sessionId}.${familyId}`).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
};

/**
 * Verify an HMAC-signed refresh token
 * Returns the session ID and family ID if valid, null otherwise
 */
export const verifyRefreshToken = (token: string): { sid: string; fid: string } | null => {
  if (!configServiceRef) throw new Error('JWT not initialized');
  
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;
  const secret = configServiceRef.get<string>('REFRESH_TOKEN_SECRET') 
    ?? configServiceRef.getOrThrow<string>('AUTH_STATE_SECRET');

  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');

  if (signature !== expectedSignature) return null;

  // Decode payload
  try {
    const decoded = Buffer.from(payload, 'base64url').toString();
    const [sid, fid] = decoded.split('.');
    if (!sid || !fid) return null;
    return { sid, fid };
  } catch {
    return null;
  }
};

/**
 * Hash a refresh token for storage (SHA-256)
 */
export const hashRefreshToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// =============================================================================
// OAuth State Utilities
// =============================================================================

export interface OAuthState {
  redirectUri: string;
  codeChallenge: string;
  clientId: string;
  provider?: string;
  connectionId?: string;
  deviceId?: string;
  devicePlatform?: string;
  nonce: string;
}

/**
 * Encode OAuth state with HMAC signature for tamper protection
 */
export const encodeOAuthState = (state: OAuthState): string => {
  if (!configServiceRef) throw new Error('JWT not initialized');
  
  const secret = configServiceRef.getOrThrow<string>('AUTH_STATE_SECRET');
  const payload = Buffer.from(JSON.stringify(state)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
};

/**
 * Decode and verify OAuth state
 */
export const decodeOAuthState = (encoded: string): OAuthState | null => {
  if (!configServiceRef) throw new Error('JWT not initialized');
  
  const parts = encoded.split('.');
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;
  const secret = configServiceRef.getOrThrow<string>('AUTH_STATE_SECRET');

  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');

  if (signature !== expectedSignature) return null;

  // Decode payload
  try {
    const decoded = Buffer.from(payload, 'base64url').toString();
    return JSON.parse(decoded) as OAuthState;
  } catch {
    return null;
  }
};
