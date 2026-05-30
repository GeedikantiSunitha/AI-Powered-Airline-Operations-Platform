import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import type { UserRole } from '@airline-ops/shared';
import { adminPersistence } from '../admin/adminPersistence';
import { verifyPassword, validatePasswordPolicy } from '../admin/passwordUtils';
import { cognitoAuth } from './cognitoAuth';

interface LoginInput {
  username: string;
  password: string;
}

export interface AuthUser {
  userId: string;
  username: string;
  role: UserRole;
}

interface LoginResult {
  token?: string;
  user?: AuthUser;
  mfaRequired?: boolean;
  mfaChallengeToken?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES_IN = '8h';
const MFA_DEV_CODE = '123456';

const mfaChallenges = new Map<string, { userId: string; username: string; role: UserRole }>();

function signUser(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export const authService = {
  validatePasswordPolicy,

  getAuthConfig() {
    return {
      provider: cognitoAuth.isEnabled() ? 'cognito' : 'local',
      cognito: cognitoAuth.getConfig(),
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumber: true,
      },
      adminMfaEnforced: process.env.ADMIN_MFA_REQUIRED !== 'false',
    };
  },

  async login(input: LoginInput): Promise<LoginResult | null> {
    if (cognitoAuth.isEnabled()) {
      return null;
    }

    const stored = await adminPersistence.findByUsername(input.username.trim().toLowerCase());
    if (!stored || stored.status === 'disabled' || !stored.passwordHash) return null;

    const valid = await verifyPassword(input.password, stored.passwordHash);
    if (!valid) return null;

    const user: AuthUser = {
      userId: stored.userId,
      username: stored.username,
      role: stored.role,
    };

    if (stored.mfaEnabled && stored.role === 'admin') {
      const challenge = randomUUID();
      mfaChallenges.set(challenge, user);
      return { mfaRequired: true, mfaChallengeToken: challenge };
    }

    return { token: signUser(user), user };
  },

  verifyMfa(challengeToken: string, code: string): LoginResult | null {
    const pending = mfaChallenges.get(challengeToken);
    if (!pending) return null;
    if (code !== MFA_DEV_CODE) return null;
    mfaChallenges.delete(challengeToken);
    const user: AuthUser = pending;
    return { token: signUser(user), user };
  },

  verifyToken(token: string): AuthUser {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  },

  async verifyTokenAsync(token: string): Promise<AuthUser> {
    if (cognitoAuth.isEnabled()) {
      const cognitoUser = await cognitoAuth.validateCognitoToken(token);
      if (cognitoUser) return cognitoUser;
      throw new Error('Invalid Cognito token');
    }
    return this.verifyToken(token);
  },
};
