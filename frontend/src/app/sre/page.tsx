'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';

interface SreDashboard {
  slo: { met: boolean; snapshot: Record<string, number> };
  widgets: Record<string, Record<string, string | number>>;
  activeAlerts: Array<{ ruleId: string; message: string; severity: string }>;
  syntheticChecks: Array<{ journey: string; passed: boolean; latencyMs: number }>;
}

export default function SrePage() {
  const [dashboard, setDashboard] = useState<SreDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getSreDashboard()
      .then(setDashboard)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-ops-critical">SRE dashboard error: {error}</p>;
  if (!dashboard) return <p className="text-slate-400">Loading SRE dashboard…</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">SRE Operations Dashboard</h2>
      <p className={`text-sm ${dashboard.slo.met ? 'text-green-400' : 'text-ops-warning'}`}>
        SLO status: {dashboard.slo.met ? 'Within target' : 'Degraded'}
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {Object.entries(dashboard.widgets).map(([key, widget]) => (
          <div key={key} className="rounded border border-slate-700 bg-ops-panel p-3 text-sm">
            <p className="font-medium capitalize text-white">{key.replace(/([A-Z])/g, ' $1')}</p>
            <pre className="mt-2 overflow-auto text-xs text-slate-400">
              {JSON.stringify(widget, null, 2)}
            </pre>
          </div>
        ))}
      </div>

      <div className="rounded border border-slate-700 bg-ops-panel p-4">
        <h3 className="text-sm font-semibold text-slate-200">Active alerts</h3>
        {dashboard.activeAlerts.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No active alerts.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-slate-300">
            {dashboard.activeAlerts.map((alert) => (
              <li key={alert.ruleId}>
                [{alert.severity}] {alert.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded border border-slate-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-ops-panel text-slate-400">
            <tr>
              <th className="p-3">Journey</th>
              <th className="p-3">Status</th>
              <th className="p-3">Latency (ms)</th>
            </tr>
          </thead>
          <tbody>
            {dashboard.syntheticChecks.map((row) => (
              <tr key={row.journey} className="border-t border-slate-700">
                <td className="p-3">{row.journey}</td>
                <td className="p-3">{row.passed ? 'PASS' : 'FAIL'}</td>
                <td className="p-3">{row.latencyMs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
