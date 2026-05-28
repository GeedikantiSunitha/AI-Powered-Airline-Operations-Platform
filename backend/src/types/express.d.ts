import type { UserRole } from '@airline-ops/shared';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        role: UserRole;
      };
    }
  }
}

export {};
