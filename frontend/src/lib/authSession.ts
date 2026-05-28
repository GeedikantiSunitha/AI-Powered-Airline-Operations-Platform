import type { UserRole } from '@airline-ops/shared';

const TOKEN_COOKIE = 'auth_token';
const USER_STORAGE_KEY = 'airline_ops_user';

export interface SessionUser {
  userId: string;
  username: string;
  role: UserRole;
}

export function setSession(token: string, user: SessionUser): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${60 * 60 * 8}; SameSite=Lax`;
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  localStorage.removeItem(USER_STORAGE_KEY);
}

export function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const raw = document.cookie
    .split('; ')
    .find((pair) => pair.startsWith(`${TOKEN_COOKIE}=`))
    ?.split('=')[1];
  return raw ? decodeURIComponent(raw) : null;
}

export function getCurrentUser(): SessionUser | null {
  if (typeof localStorage === 'undefined') return null;

  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as SessionUser;
    } catch {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }

  // Fallback: if storage was cleared but auth cookie still exists, derive UI user from JWT payload.
  const token = getToken();
  if (!token) return null;

  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(normalized)) as Partial<SessionUser>;
    if (!decoded.userId || !decoded.username || !decoded.role) return null;
    const user: SessionUser = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
    };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    return user;
  } catch {
    return null;
  }
}

