'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setSession } from '@/lib/authSession';
import { api } from '@/lib/apiClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('viewer');
  const [password, setPassword] = useState('viewer123');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaChallengeToken, setMfaChallengeToken] = useState<string | null>(null);
  const [cognitoToken, setCognitoToken] = useState('');
  const [authProvider, setAuthProvider] = useState<'local' | 'cognito'>('local');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void api
      .getAuthConfig()
      .then((config) => {
        if (config.provider === 'cognito') setAuthProvider('cognito');
      })
      .catch(() => undefined);
  }, []);

  function completeLogin(token: string, user: { userId: string; username: string; role: string }) {
    setSession(token, {
      userId: user.userId,
      username: user.username,
      role: user.role as 'admin' | 'operations_manager' | 'crew_manager' | 'analyst' | 'viewer',
    });
    router.replace(user.role === 'admin' ? '/admin' : '/');
  }

  async function onCognitoTokenSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${cognitoToken.trim()}` },
      });
      const payload = (await res.json()) as {
        user?: { userId: string; username: string; role: string };
        message?: string;
      };
      if (!res.ok || !payload.user) {
        throw new Error(payload.message || 'Invalid Cognito token');
      }
      completeLogin(cognitoToken.trim(), payload.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify Cognito token');
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mfaChallengeToken) {
        const result = await api.verifyMfa(mfaChallengeToken, mfaCode);
        completeLogin(result.token!, result.user!);
        return;
      }

      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const payload = (await res.json()) as {
        token?: string;
        user?: { userId: string; username: string; role: string };
        mfaRequired?: boolean;
        mfaChallengeToken?: string;
        message?: string;
      };

      if (!res.ok) {
        throw new Error(payload.message || 'Invalid credentials');
      }

      if (payload.mfaRequired && payload.mfaChallengeToken) {
        setMfaChallengeToken(payload.mfaChallengeToken);
        return;
      }

      if (!payload.token || !payload.user) {
        throw new Error('Login response incomplete');
      }

      completeLogin(payload.token, payload.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to login');
    } finally {
      setLoading(false);
    }
  }

  if (authProvider === 'cognito') {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-lg border border-slate-700 bg-ops-panel p-6">
        <h2 className="text-xl font-semibold text-white">Sign in with Cognito</h2>
        <p className="mt-2 text-sm text-slate-400">
          Paste your Cognito ID or access token from your organization SSO. Role is read from{' '}
          <code>custom:role</code> or <code>cognito:groups</code>.
        </p>
        <form className="mt-6 space-y-4" onSubmit={onCognitoTokenSubmit}>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Cognito JWT</label>
            <textarea
              value={cognitoToken}
              onChange={(e) => setCognitoToken(e.target.value)}
              className="h-28 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 font-mono text-xs"
              placeholder="eyJraWQiOi..."
              required
            />
          </div>
          {error ? <p className="text-sm text-ops-critical">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-ops-accent px-3 py-2 font-semibold text-slate-900 disabled:opacity-60"
          >
            {loading ? 'Verifying…' : 'Continue with token'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-16 max-w-md rounded-lg border border-slate-700 bg-ops-panel p-6">
      <h2 className="text-xl font-semibold text-white">Sign in</h2>
      <p className="mt-2 text-sm text-slate-400">
        Demo: <code>admin/admin123</code> (MFA code <code>123456</code>), <code>analyst/analyst123</code>,{' '}
        <code>viewer/viewer123</code>
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        {!mfaChallengeToken ? (
          <>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2"
                required
              />
            </div>
          </>
        ) : (
          <div>
            <label className="mb-1 block text-sm text-slate-300">Admin MFA code</label>
            <input
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 font-mono"
              placeholder="123456"
              required
            />
          </div>
        )}
        {error ? <p className="text-sm text-ops-critical">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-ops-accent px-3 py-2 font-semibold text-slate-900 disabled:opacity-60"
        >
          {loading ? 'Signing in...' : mfaChallengeToken ? 'Verify MFA' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
