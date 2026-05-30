import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { UserRole } from '@airline-ops/shared';
import type { AuthUser } from './authService';

const ROLE_CLAIM = process.env.COGNITO_ROLE_CLAIM ?? 'custom:role';
const GROUPS_CLAIM = 'cognito:groups';

const GROUP_TO_ROLE: Record<string, UserRole> = {
  admin: 'admin',
  operations_manager: 'operations_manager',
  crew_manager: 'crew_manager',
  analyst: 'analyst',
  viewer: 'viewer',
};

function resolveRole(payload: JWTPayload): UserRole {
  const direct = payload[ROLE_CLAIM];
  if (typeof direct === 'string' && direct in GROUP_TO_ROLE) {
    return direct as UserRole;
  }

  const groups = payload[GROUPS_CLAIM];
  if (Array.isArray(groups)) {
    for (const group of groups) {
      const mapped = GROUP_TO_ROLE[String(group)];
      if (mapped) return mapped;
    }
  }

  return 'viewer';
}

function resolveUsername(payload: JWTPayload): string {
  const candidates = [
    payload['cognito:username'],
    payload.username,
    payload.email,
    payload.sub,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return 'cognito-user';
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksIssuer = '';

function getJwks(): { jwks: ReturnType<typeof createRemoteJWKSet>; issuer: string } {
  const region = process.env.COGNITO_REGION ?? process.env.AWS_REGION ?? 'us-east-1';
  const userPoolId = process.env.COGNITO_USER_POOL_ID ?? '';
  if (!userPoolId) {
    throw new Error('COGNITO_USER_POOL_ID is required when AUTH_PROVIDER=cognito');
  }
  const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
  if (!jwks || jwksIssuer !== issuer) {
    jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
    jwksIssuer = issuer;
  }
  return { jwks: jwks!, issuer };
}

export const cognitoAuth = {
  isEnabled(): boolean {
    return process.env.AUTH_PROVIDER === 'cognito';
  },

  getConfig() {
    return {
      enabled: this.isEnabled(),
      region: process.env.COGNITO_REGION ?? process.env.AWS_REGION ?? 'us-east-1',
      userPoolId: process.env.COGNITO_USER_POOL_ID ?? '',
      clientId: process.env.COGNITO_CLIENT_ID ?? '',
      mfaRequiredForAdmins: process.env.ADMIN_MFA_REQUIRED !== 'false',
      roleClaim: ROLE_CLAIM,
    };
  },

  async validateCognitoToken(token: string): Promise<AuthUser | null> {
    if (!this.isEnabled()) return null;

    const clientId = process.env.COGNITO_CLIENT_ID ?? '';
    if (!clientId) {
      throw new Error('COGNITO_CLIENT_ID is required when AUTH_PROVIDER=cognito');
    }

    const { jwks: remoteJwks, issuer } = getJwks();
    const { payload } = await jwtVerify(token, remoteJwks, { issuer });

    const tokenUse = payload.token_use;
    if (tokenUse === 'access') {
      if (String(payload.client_id ?? '') !== clientId) return null;
    } else if (tokenUse === 'id') {
      const aud = payload.aud;
      const audiences = Array.isArray(aud) ? aud : [aud];
      if (!audiences.map(String).includes(clientId)) return null;
    } else if (tokenUse) {
      return null;
    }

    const userId = String(payload.sub ?? '');
    if (!userId) return null;

    return {
      userId,
      username: resolveUsername(payload),
      role: resolveRole(payload),
    };
  },
};
