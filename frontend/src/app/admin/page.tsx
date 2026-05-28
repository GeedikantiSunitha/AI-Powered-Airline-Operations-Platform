'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import type { AdminUser, AlertRule } from '@/lib/apiClient';

const roleOptions: AdminUser['role'][] = [
  'admin',
  'operations_manager',
  'crew_manager',
  'analyst',
  'viewer',
];

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [newRole, setNewRole] = useState<AdminUser['role']>('viewer');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load(): Promise<void> {
      const [usersResult, rulesResult] = await Promise.allSettled([
        api.getAdminUsers(),
        api.getAlertRules(),
      ]);

      if (usersResult.status === 'fulfilled') {
        setUsers(usersResult.value);
      }
      if (rulesResult.status === 'fulfilled') {
        setRules(rulesResult.value);
      }

      if (usersResult.status === 'rejected' && rulesResult.status === 'rejected') {
        setError('Failed to fetch admin users and alert rules');
      } else if (usersResult.status === 'rejected') {
        setError('Failed to fetch admin users');
      } else if (rulesResult.status === 'rejected') {
        setError('Failed to fetch alert rules');
      } else {
        setError(null);
      }
      setLoading(false);
    }
    void load();
  }, []);

  async function createUser(): Promise<void> {
    if (!username.trim()) return;
    setError(null);
    setSaving(true);
    try {
      const created = await api.createAdminUser({ username: username.trim(), role: newRole });
      setUsers((prev) => [...prev, created]);
      setUsername('');
      setNewRole('viewer');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create user');
    } finally {
      setSaving(false);
    }
  }

  async function updateUser(usernameToUpdate: string, patch: Partial<AdminUser>): Promise<void> {
    setError(null);
    setSaving(true);
    try {
      const updated = await api.updateAdminUser(usernameToUpdate, patch);
      setUsers((prev) => prev.map((u) => (u.username === usernameToUpdate ? updated : u)));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update user');
    } finally {
      setSaving(false);
    }
  }

  async function updateRule(ruleId: string, patch: { enabled?: boolean; threshold?: number }): Promise<void> {
    setError(null);
    setSaving(true);
    try {
      const updated = await api.updateAlertRule(ruleId, patch);
      setRules((prev) => prev.map((r) => (r.ruleId === ruleId ? updated : r)));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update alert rule');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-slate-400">Loading admin settings…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Admin / User Management</h2>
        <p className="text-sm text-slate-400">Manage users and alert policy thresholds.</p>
      </div>

      {error ? <p className="rounded border border-rose-700 bg-rose-900/20 p-2 text-sm text-rose-300">{error}</p> : null}

      <section className="rounded border border-slate-700 bg-ops-panel p-4">
        <h3 className="mb-3 text-sm font-semibold">Create user</h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as AdminUser['role'])}
            className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <button
            disabled={saving}
            onClick={() => void createUser()}
            className="rounded border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Create'}
          </button>
        </div>
      </section>

      <section className="rounded border border-slate-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-ops-panel text-slate-400">
            <tr>
              <th className="p-3">Username</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.username} className="border-t border-slate-700">
                <td className="p-3">{user.username}</td>
                <td className="p-3">{user.role}</td>
                <td className="p-3">{user.status}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        void updateUser(user.username, {
                          status: user.status === 'active' ? 'disabled' : 'active',
                        })
                      }
                      className="rounded border border-slate-600 px-2 py-1 text-xs hover:bg-slate-800"
                    >
                      Toggle status
                    </button>
                    <button
                      onClick={() => {
                        const currentIndex = roleOptions.indexOf(user.role);
                        const nextRole = roleOptions[(currentIndex + 1) % roleOptions.length];
                        void updateUser(user.username, { role: nextRole });
                      }}
                      className="rounded border border-slate-600 px-2 py-1 text-xs hover:bg-slate-800"
                    >
                      Cycle role
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded border border-slate-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-ops-panel text-slate-400">
            <tr>
              <th className="p-3">Rule</th>
              <th className="p-3">Enabled</th>
              <th className="p-3">Threshold</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.ruleId} className="border-t border-slate-700">
                <td className="p-3">{rule.type}</td>
                <td className="p-3">{rule.enabled ? 'Yes' : 'No'}</td>
                <td className="p-3">{rule.threshold}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => void updateRule(rule.ruleId, { enabled: !rule.enabled })}
                      className="rounded border border-slate-600 px-2 py-1 text-xs hover:bg-slate-800"
                    >
                      Toggle
                    </button>
                    <button
                      onClick={() => {
                        const next = Number((rule.threshold + 0.05).toFixed(2));
                        void updateRule(rule.ruleId, { threshold: next });
                      }}
                      className="rounded border border-slate-600 px-2 py-1 text-xs hover:bg-slate-800"
                    >
                      +0.05
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
