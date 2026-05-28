import jwt from 'jsonwebtoken';
import type { UserRole } from '@airline-ops/shared';

interface LoginInput {
  username: string;
  password: string;
}

interface AuthUser {
  userId: string;
  username: string;
  role: UserRole;
}

const DEV_USERS: Array<AuthUser & { password: string }> = [
  { userId: 'u-admin', username: 'admin', password: 'admin123', role: 'admin' },
  {
    userId: 'u-ops-manager',
    username: 'opsmanager',
    password: 'ops123',
    role: 'operations_manager',
  },
  {
    userId: 'u-crew-manager',
    username: 'crewmanager',
    password: 'crew123',
    role: 'crew_manager',
  },
  { userId: 'u-analyst', username: 'analyst', password: 'analyst123', role: 'analyst' },
  { userId: 'u-viewer', username: 'viewer', password: 'viewer123', role: 'viewer' },
];

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES_IN = '8h';

export const authService = {
  login(input: LoginInput): { token: string; user: AuthUser } | null {
    const match = DEV_USERS.find(
      (user) => user.username === input.username && user.password === input.password
    );
    if (!match) return null;

    const user: AuthUser = {
      userId: match.userId,
      username: match.username,
      role: match.role,
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return { token, user };
  },

  verifyToken(token: string): AuthUser {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  },
};

