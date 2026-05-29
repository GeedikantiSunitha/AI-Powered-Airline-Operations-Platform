'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';

export default function BaggagePage() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof api.getBaggageDashboard>>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getBaggageDashboard()
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-ops-critical">{error}</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Baggage Operations</h2>
      <div className="overflow-x-auto rounded border border-slate-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-ops-panel text-slate-400">
            <tr>
              <th className="p-3">Flight</th>
              <th className="p-3">Loaded</th>
              <th className="p-3">Delayed bags</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.flightLegId} className="border-t border-slate-700">
                <td className="p-3">{row.flightNumber}</td>
                <td className="p-3">{row.bagsLoaded}</td>
                <td className="p-3">{row.bagsDelayed}</td>
                <td className="p-3">
                  <span
                    className={
                      row.status === 'AT_RISK' ? 'text-ops-warning' : 'text-emerald-400'
                    }
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
