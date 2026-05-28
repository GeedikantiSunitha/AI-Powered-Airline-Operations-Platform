'use client';

import { useEffect, useState } from 'react';
import type { FlightLeg } from '@airline-ops/shared';
import { api } from '@/lib/apiClient';
import { PhasePlaceholder } from '@/components/ui/PhasePlaceholder';
import { connectWs } from '@/lib/wsClient';
import { FlightMap } from './FlightMap';
import { FlightDetailDrawer } from './FlightDetailDrawer';

export function OperationsDashboard() {
  const [flights, setFlights] = useState<FlightLeg[]>([]);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [liveEventText, setLiveEventText] = useState<string>('No live updates yet');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getFlights()
      .then(setFlights)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    const disconnect = connectWs((message) => {
      const event = message as {
        type?: string;
        payload?: {
          flightLegId: string;
          status?: FlightLeg['status'];
          delayMinutes?: number;
          gate?: string | null;
          estimatedDeparture?: string | null;
          updatedAt?: string;
        };
      };
      if (event.type !== 'flight.status.updated' || !event.payload) return;

      setFlights((current) =>
        current.map((flight) =>
          flight.flightLegId === event.payload?.flightLegId
            ? {
                ...flight,
                status: event.payload.status ?? flight.status,
                delayMinutes: event.payload.delayMinutes ?? flight.delayMinutes,
                gate: event.payload.gate ?? flight.gate,
                estimatedDeparture: event.payload.estimatedDeparture ?? flight.estimatedDeparture,
              }
            : flight
        )
      );

      setLiveEventText(
        `${event.payload.flightLegId} updated at ${new Date(
          event.payload.updatedAt ?? Date.now()
        ).toLocaleTimeString()}`
      );
    });

    return () => disconnect();
  }, []);

  if (loading) return <p className="text-slate-400">Loading flights…</p>;
  if (error) {
    return (
      <PhasePlaceholder
        title="Operations Dashboard"
        phase={2}
        message={`API not reachable: ${error}. Start backend on port 3001.`}
      />
    );
  }

  const selectedFlight = selectedFlightId
    ? flights.find((f) => f.flightLegId === selectedFlightId) ?? null
    : null;

  async function simulateDelay(flightLegId: string): Promise<void> {
    await api.simulateDelay(flightLegId, 15);
  }

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold">Operations Dashboard</h2>
      <p className="mb-2 text-sm text-slate-400">Live event: {liveEventText}</p>
      <p className="mb-4 text-xs text-slate-500">
        Tip: click “Simulate +15m” on any row to publish <code>flight.status.updated</code>.
      </p>

      <div className="mb-4">
        <FlightMap flights={flights} onSelect={setSelectedFlightId} />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-ops-panel text-slate-400">
            <tr>
              <th className="p-3">Flight</th>
              <th className="p-3">Route</th>
              <th className="p-3">Status</th>
              <th className="p-3">Gate</th>
              <th className="p-3">Delay</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {flights.map((f) => (
              <tr
                key={f.flightLegId}
                className="cursor-pointer border-t border-slate-700 hover:bg-slate-900/60"
                onClick={() => setSelectedFlightId(f.flightLegId)}
              >
                <td className="p-3 font-medium">{f.flightNumber}</td>
                <td className="p-3">
                  {f.origin} → {f.destination}
                </td>
                <td className="p-3">
                  <StatusBadge status={f.status} />
                </td>
                <td className="p-3">{f.gate ?? '—'}</td>
                <td className="p-3">{f.delayMinutes ? `${f.delayMinutes} min` : '—'}</td>
                <td className="p-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void simulateDelay(f.flightLegId);
                    }}
                    className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
                  >
                    Simulate +15m
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FlightDetailDrawer flight={selectedFlight} onClose={() => setSelectedFlightId(null)} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DELAYED: 'text-ops-warning',
    CANCELLED: 'text-ops-critical',
    SCHEDULED: 'text-slate-300',
    BOARDING: 'text-ops-accent',
  };
  return <span className={colors[status] ?? 'text-slate-300'}>{status}</span>;
}
