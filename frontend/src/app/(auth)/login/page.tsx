'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setSession } from '@/lib/authSession';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('viewer');
  const [password, setPassword] = useState('viewer123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const payload = (await res.json()) as {
        token?: string;
        user?: { userId: string; username: string; role: string };
        message?: string;
      };

      if (!res.ok || !payload.token || !payload.user) {
        throw new Error(payload.message || 'Invalid credentials');
      }

      setSession(payload.token, {
        userId: payload.user.userId,
        username: payload.user.username,
        role: payload.user.role as
          | 'admin'
          | 'operations_manager'
          | 'crew_manager'
          | 'analyst'
          | 'viewer',
      });
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-md rounded-lg border border-slate-700 bg-ops-panel p-6">
      <h2 className="text-xl font-semibold text-white">Sign in</h2>
      <p className="mt-2 text-sm text-slate-400">
        Demo users: <code>admin/admin123</code>, <code>analyst/analyst123</code>,{' '}
        <code>viewer/viewer123</code>
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
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
        {error ? <p className="text-sm text-ops-critical">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-ops-accent px-3 py-2 font-semibold text-slate-900 disabled:opacity-60"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
