'use client';

import { useEffect, useState } from 'react';
import { api, type AdminUser, type AlertRule } from '@/lib/apiClient';

type Tab =
  | 'overview'
  | 'users'
  | 'permissions'
  | 'mlops'
  | 'security'
  | 'audit'
  | 'commercial'
  | 'flags'
  | 'alerts';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'System health' },
  { id: 'users', label: 'Users' },
  { id: 'permissions', label: 'Permissions' },
  { id: 'mlops', label: 'MLOps' },
  { id: 'security', label: 'Security' },
  { id: 'audit', label: 'Audit log' },
  { id: 'commercial', label: 'Commercial config' },
  { id: 'flags', label: 'Feature flags' },
  { id: 'alerts', label: 'Alert rules' },
];

const roleOptions: AdminUser['role'][] = [
  'admin',
  'operations_manager',
  'crew_manager',
  'analyst',
  'viewer',
];

const PASSWORD_POLICY_HINT =
  'At least 8 characters with uppercase, lowercase, and a number (e.g. CrewMgr1).';

function validatePasswordPolicy(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must include a number';
  return null;
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState<string | null>(null);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [healthHub, setHealthHub] = useState<Record<string, unknown> | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [permissions, setPermissions] = useState<
    Array<{ moduleId: string; label: string; roles: string[] }>
  >([]);
  const [mlops, setMlops] = useState<Record<string, unknown> | null>(null);
  const [security, setSecurity] = useState<Record<string, unknown> | null>(null);
  const [auditLogs, setAuditLogs] = useState<
    Array<{ action: string; userId?: string; at: string; resource?: string }>
  >([]);
  const [commercialConfig, setCommercialConfig] = useState<Record<string, unknown>>({});
  const [flags, setFlags] = useState<Array<{ flagKey: string; enabled: boolean; description: string }>>(
    []
  );
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [authConfig, setAuthConfig] = useState<Record<string, unknown> | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newRole, setNewRole] = useState<AdminUser['role']>('viewer');

  useEffect(() => {
    void loadAll();
  }, []);

  function selectTab(next: Tab) {
    setTab(next);
    if (next !== 'users') {
      setUserError(null);
      setUserSuccess(null);
    }
    if (next !== 'alerts') setAlertsError(null);
  }

  async function toggleAlertRule(rule: AlertRule) {
    setAlertsError(null);
    try {
      const updated = await api.updateAlertRule(rule.ruleId, { enabled: !rule.enabled });
      setRules((prev) => prev.map((r) => (r.ruleId === updated.ruleId ? updated : r)));
    } catch (e) {
      setAlertsError(e instanceof Error ? e.message : 'Failed to update alert rule');
    }
  }

  async function loadAll() {
    setLoading(true);
    setLoadError(null);
    try {
      const results = await Promise.allSettled([
        api.getAdminHealthHub(),
        api.getAdminUsers(),
        api.getPermissionMatrix(),
        api.getAdminMlopsSummary(),
        api.getAdminSecuritySummary(),
        api.getAdminAuditLogs(80),
        api.getCommercialConfig(),
        api.getFeatureFlags(),
        api.getAlertRules(),
        api.getAuthConfig(),
      ]);
      if (results[0].status === 'fulfilled') setHealthHub(results[0].value);
      if (results[1].status === 'fulfilled') setUsers(results[1].value);
      if (results[2].status === 'fulfilled') setPermissions(results[2].value);
      if (results[3].status === 'fulfilled') setMlops(results[3].value);
      if (results[4].status === 'fulfilled') setSecurity(results[4].value);
      if (results[5].status === 'fulfilled') setAuditLogs(results[5].value);
      if (results[6].status === 'fulfilled') setCommercialConfig(results[6].value);
      if (results[7].status === 'fulfilled') setFlags(results[7].value);
      else {
        const enabled = await api.getEnabledFeatureFlags();
        setFlags(
          Object.entries(enabled).map(([flagKey, enabledFlag]) => ({
            flagKey,
            enabled: enabledFlag,
            description: flagKey,
          }))
        );
      }
      if (results[8].status === 'fulfilled') setRules(results[8].value);
      if (results[9].status === 'fulfilled') setAuthConfig(results[9].value);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load admin console');
    } finally {
      setLoading(false);
    }
  }

  async function createUser() {
    const trimmed = username.trim();
    if (!trimmed || !password) return;

    setUserError(null);
    setUserSuccess(null);

    const policyError = validatePasswordPolicy(password);
    if (policyError) {
      setUserError(policyError);
      return;
    }
    if (users.some((u) => u.username.toLowerCase() === trimmed.toLowerCase())) {
      setUserError(`User "${trimmed}" already exists. Choose a different username.`);
      return;
    }

    setSaving(true);
    try {
      const created = await api.createAdminUser({
        username: trimmed,
        role: newRole,
        password,
      });
      setUsers((prev) => [...prev, created]);
      setUsername('');
      setPassword('');
      setUserSuccess(`Created user "${created.username}" (${created.role}).`);
    } catch (e) {
      setUserError(e instanceof Error ? e.message : 'Create user failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-slate-400">Loading admin console…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Admin Console</h2>
        <p className="text-sm text-slate-400">
          Platform health, identity, MLOps, security, commercial config, and feature flags.
        </p>
        {authConfig && (
          <p className="mt-1 text-xs text-slate-500">
            Auth: {String(authConfig.provider)} · Admin MFA enforced:{' '}
            {String(authConfig.adminMfaEnforced)}
          </p>
        )}
      </div>

      {loadError ? (
        <p className="rounded border border-rose-800 bg-rose-950/30 p-2 text-sm text-rose-300">{loadError}</p>
      ) : null}

      <nav className="flex flex-wrap gap-1 border-b border-slate-700 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => selectTab(t.id)}
            className={`rounded px-3 py-1 text-xs ${
              tab === t.id ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && healthHub && (
        <div className="grid gap-3 md:grid-cols-2">
          <Panel title="Persistence">
            <pre className="text-xs text-slate-400">{JSON.stringify(healthHub.persistence, null, 2)}</pre>
          </Panel>
          <Panel title="SRE">
            <pre className="text-xs text-slate-400">{JSON.stringify(healthHub.sre, null, 2)}</pre>
          </Panel>
          <Panel title="Booking funnel">
            <pre className="text-xs text-slate-400">{JSON.stringify(healthHub.booking, null, 2)}</pre>
          </Panel>
          <Panel title="Feature flags">
            <pre className="text-xs text-slate-400">{JSON.stringify(healthHub.featureFlags, null, 2)}</pre>
          </Panel>
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-4">
          {userError ? (
            <p className="rounded border border-rose-800 bg-rose-950/30 p-2 text-sm text-rose-300">{userError}</p>
          ) : null}
          {userSuccess ? (
            <p className="rounded border border-emerald-800 bg-emerald-950/30 p-2 text-sm text-emerald-300">
              {userSuccess}
            </p>
          ) : null}
          <Panel title="Create user (password policy enforced)">
            <p className="mb-2 text-xs text-slate-400">{PASSWORD_POLICY_HINT}</p>
            <div className="grid gap-2 md:grid-cols-4">
              <input
                placeholder="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setUserError(null);
                  setUserSuccess(null);
                }}
                className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
              />
              <input
                type="password"
                placeholder="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setUserError(null);
                  setUserSuccess(null);
                }}
                className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as AdminUser['role'])}
                className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button
                disabled={saving}
                onClick={() => void createUser()}
                className="rounded bg-sky-600 px-3 py-2 text-sm text-white"
              >
                Create
              </button>
            </div>
          </Panel>
          <table className="w-full text-left text-sm">
            <thead className="bg-ops-panel text-slate-400">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Role</th>
                <th className="p-3">MFA</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.username} className="border-t border-slate-700">
                  <td className="p-3">{user.username}</td>
                  <td className="p-3">{user.role}</td>
                  <td className="p-3">{user.mfaEnabled ? 'On' : 'Off'}</td>
                  <td className="p-3">{user.status}</td>
                  <td className="p-3">
                    <button
                      className="text-xs text-sky-400 underline"
                      onClick={() =>
                        void api
                          .updateAdminUser(user.username, {
                            status: user.status === 'active' ? 'disabled' : 'active',
                          })
                          .then((u) => setUsers((prev) => prev.map((x) => (x.username === u.username ? u : x))))
                      }
                    >
                      Toggle status
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'permissions' && (
        <div className="overflow-x-auto rounded border border-slate-700">
          <table className="w-full text-left text-xs">
            <thead className="bg-ops-panel text-slate-400">
              <tr>
                <th className="p-2">Module</th>
                {roleOptions.map((r) => (
                  <th key={r} className="p-2">
                    {r.replace('_', ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map((mod) => (
                <tr key={mod.moduleId} className="border-t border-slate-800">
                  <td className="p-2 font-medium text-slate-200">{mod.label}</td>
                  {roleOptions.map((r) => (
                    <td key={r} className="p-2 text-center">
                      {mod.roles.includes(r) ? '✓' : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'mlops' && mlops && (
        <pre className="overflow-auto rounded border border-slate-700 bg-slate-900/50 p-4 text-xs text-slate-300">
          {JSON.stringify(mlops, null, 2)}
        </pre>
      )}

      {tab === 'security' && security && (
        <pre className="overflow-auto rounded border border-slate-700 bg-slate-900/50 p-4 text-xs text-slate-300">
          {JSON.stringify(security, null, 2)}
        </pre>
      )}

      {tab === 'audit' && (
        <table className="w-full text-left text-sm">
          <thead className="bg-ops-panel text-slate-400">
            <tr>
              <th className="p-3">Time</th>
              <th className="p-3">User</th>
              <th className="p-3">Action</th>
              <th className="p-3">Resource</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((log, i) => (
              <tr key={`${log.at}-${i}`} className="border-t border-slate-700">
                <td className="p-3 text-xs">{new Date(log.at).toLocaleString()}</td>
                <td className="p-3">{log.userId ?? '—'}</td>
                <td className="p-3">{log.action}</td>
                <td className="p-3 text-xs text-slate-400">{log.resource ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'commercial' && (
        <div className="space-y-3">
          <Panel title="Fare rules">
            <ConfigEditor
              configKey="fare_rules"
              value={(commercialConfig.fare_rules as Record<string, unknown>) ?? {}}
              onSave={async (value) => {
                await api.updateCommercialConfig('fare_rules', value);
                setCommercialConfig(await api.getCommercialConfig());
              }}
            />
          </Panel>
          <Panel title="Experiments">
            <ConfigEditor
              configKey="experiments"
              value={(commercialConfig.experiments as Record<string, unknown>) ?? {}}
              onSave={async (value) => {
                await api.updateCommercialConfig('experiments', value);
                setCommercialConfig(await api.getCommercialConfig());
              }}
            />
          </Panel>
        </div>
      )}

      {tab === 'flags' && (
        <div className="space-y-2">
          {flags.length === 0 ? (
            <p className="text-sm text-slate-400">
              No feature flags loaded.{' '}
              <button
                type="button"
                className="text-sky-400 underline"
                onClick={() => void loadAll()}
              >
                Retry
              </button>
            </p>
          ) : null}
          {flags.map((flag) => (
            <div
              key={flag.flagKey}
              className="flex items-center justify-between rounded border border-slate-700 p-3 text-sm"
            >
              <div>
                <p className="font-medium">{flag.flagKey}</p>
                <p className="text-xs text-slate-400">{flag.description}</p>
              </div>
              <button
                onClick={() =>
                  void api.updateFeatureFlag(flag.flagKey, !flag.enabled).then((updated) =>
                    setFlags((prev) => prev.map((f) => (f.flagKey === updated.flagKey ? { ...f, ...updated } : f)))
                  )
                }
                className={`rounded px-3 py-1 text-xs ${flag.enabled ? 'bg-emerald-700' : 'bg-slate-700'}`}
              >
                {flag.enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'alerts' && (
        <div className="space-y-3">
          {alertsError ? (
            <p className="rounded border border-rose-800 bg-rose-950/30 p-2 text-sm text-rose-300">{alertsError}</p>
          ) : null}
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
                  <button
                    onClick={() => void toggleAlertRule(rule)}
                    className="text-xs text-sky-400 underline"
                  >
                    Toggle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-slate-700 bg-ops-panel p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-200">{title}</h3>
      {children}
    </section>
  );
}

function ConfigEditor({
  value,
  onSave,
}: {
  configKey: string;
  value: Record<string, unknown>;
  onSave: (value: Record<string, unknown>) => Promise<void>;
}) {
  const [text, setText] = useState(JSON.stringify(value, null, 2));
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <textarea
        className="h-32 w-full rounded border border-slate-600 bg-slate-900 p-2 font-mono text-xs"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        onClick={() => {
          try {
            const parsed = JSON.parse(text) as Record<string, unknown>;
            void onSave(parsed).then(() => setMsg('Saved'));
          } catch {
            setMsg('Invalid JSON');
          }
        }}
        className="rounded bg-sky-600 px-3 py-1 text-xs text-white"
      >
        Save
      </button>
      {msg ? <span className="ml-2 text-xs text-emerald-400">{msg}</span> : null}
    </div>
  );
}
