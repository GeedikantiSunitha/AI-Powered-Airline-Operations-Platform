'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';

export default function CrewPage() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof api.getCrewDashboard>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getCrewDashboard()
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-400">Loading crew dashboard…</p>;
  if (error) return <p className="text-ops-critical">Crew dashboard error: {error}</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Crew Coordination</h2>
      <div className="space-y-3">
        {rows.map((flight) => (
          <div key={flight.flightLegId} className="rounded border border-slate-700 bg-ops-panel p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-white">
                {flight.flightNumber} · {flight.status}
                {flight.delayMinutes > 0 ? ` · ${flight.delayMinutes}m delay` : ''}
              </p>
              {flight.reserveActivationRecommended && (
                <span className="rounded bg-amber-900/50 px-2 py-0.5 text-xs text-amber-300">
                  Reserve activation recommended
                </span>
              )}
            </div>
            <ul className="mt-2 space-y-1 text-slate-400">
              {flight.crew.map((member) => (
                <li key={member.crewMemberId}>
                  {member.role} ({member.crewMemberId}) —{' '}
                  {member.legal ? (
                    <span className="text-emerald-400">legal</span>
                  ) : (
                    <span className="text-ops-critical">duty violation</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
