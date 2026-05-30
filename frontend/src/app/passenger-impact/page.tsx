'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/apiClient';

export default function PassengerImpactPage() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof api.getPassengerImpactOps>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getPassengerImpactOps()
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-400">Loading passenger impact…</p>;
  if (error) return <p className="text-ops-critical">Passenger impact error: {error}</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Passenger Impact</h2>
      <p className="text-sm text-slate-400">
        Delay predictions linked to active bookings — drive commercial rebooking actions.
      </p>
      {rows.length === 0 ? (
        <p className="text-slate-500">No disrupted flights with impact data right now.</p>
      ) : (
        rows.map((row) => (
          <div key={row.flightLegId} className="rounded border border-slate-700 bg-ops-panel p-4 text-sm">
            <p className="font-medium text-white">
              {row.flightNumber} · {row.delayMinutes}m delay
            </p>
            <p className="mt-1 text-slate-400">
              Affected passengers (est.):{' '}
              {String((row.prediction as { affectedPassengerEstimate?: number }).affectedPassengerEstimate ?? '—')}
              {' · '}
              Misconnect risk:{' '}
              {String((row.prediction as { misconnectRiskScore?: number }).misconnectRiskScore ?? '—')}
            </p>
            <p className="mt-2 text-slate-300">{row.recommendedAction}</p>
            {row.affectedPnrs.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {row.affectedPnrs.map((p) => (
                  <Link
                    key={p}
                    href={`/commercial?pnr=${p}`}
                    className="rounded bg-amber-600/80 px-2 py-1 text-xs text-white hover:bg-amber-500"
                  >
                    Optimize {p}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">No ticketed PNRs on this leg — book via Book Flight first.</p>
            )}
          </div>
        ))
      )}
    </div>
  );
}
