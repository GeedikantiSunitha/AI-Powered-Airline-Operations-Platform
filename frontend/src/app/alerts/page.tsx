'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Alert } from '@airline-ops/shared';
import { api } from '@/lib/apiClient';
import { connectWs } from '@/lib/wsClient';
import { PhasePlaceholder } from '@/components/ui/PhasePlaceholder';

type AlertTestType =
  | 'DelayRiskElevated'
  | 'CrewUnavailable'
  | 'WeatherRiskDetected'
  | 'BaggageDelayDetected';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [injecting, setInjecting] = useState<AlertTestType | null>(null);

  useEffect(() => {
    api
      .getAlerts()
      .then((rows) => setAlerts(rows))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));

    const disconnect = connectWs(
      (raw) => {
        const event = raw as { type?: string; payload?: Alert };
        if (!event.type || !event.payload) return;
        if (event.type === 'alerts.created') {
          setAlerts((current) => [event.payload as Alert, ...current]);
        }
        if (event.type === 'alerts.updated') {
          setAlerts((current) =>
            current.map((item) => (item.alertId === event.payload?.alertId ? event.payload : item))
          );
        }
      },
      ['alerts.created', 'alerts.updated']
    );
    return () => disconnect();
  }, []);

  async function inject(type: AlertTestType): Promise<void> {
    setInjecting(type);
    try {
      switch (type) {
        case 'DelayRiskElevated':
          await api.injectTestAlert({
            type,
            flightLegId: 'FL-20260521-AI302-DEL-BOM',
            probability: 0.82,
          });
          break;
        case 'CrewUnavailable':
          await api.injectTestAlert({
            type,
            flightLegId: 'FL-20260521-AI405-BOM-BLR',
          });
          break;
        case 'WeatherRiskDetected':
          await api.injectTestAlert({
            type,
            airportIata: 'BOM',
            weatherRiskScore: 0.79,
          });
          break;
        case 'BaggageDelayDetected':
          await api.injectTestAlert({
            type,
            flightLegId: 'FL-20260521-AI118-DEL-DXB',
            delayedBags: 46,
          });
          break;
      }
    } finally {
      setInjecting(null);
    }
  }

  async function acknowledge(alertId: string): Promise<void> {
    const updated = await api.acknowledgeAlert(alertId);
    setAlerts((current) => current.map((row) => (row.alertId === alertId ? updated : row)));
  }

  const incidentHistory = useMemo(() => alerts.filter((a) => a.acknowledged), [alerts]);

  if (loading) return <p className="text-slate-400">Loading alerts…</p>;
  if (error) {
    return (
      <PhasePlaceholder title="Alerts & Incident History" phase={7} message={`Alerts API error: ${error}`} />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold">Alerts & Incident History</h2>
        <p className="text-sm text-slate-400">
          Inject a test event to validate event-driven alerts end-to-end.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
        {(
          [
            'DelayRiskElevated',
            'CrewUnavailable',
            'WeatherRiskDetected',
            'BaggageDelayDetected',
          ] as AlertTestType[]
        ).map((type) => (
          <button
            key={type}
            onClick={() => void inject(type)}
            disabled={injecting !== null}
            className="rounded border border-slate-700 bg-ops-panel px-3 py-2 text-left text-sm hover:bg-slate-800 disabled:opacity-60"
          >
            {injecting === type ? 'Injecting…' : `Inject ${type}`}
          </button>
        ))}
      </div>

      <div className="rounded border border-slate-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-ops-panel text-slate-400">
            <tr>
              <th className="p-3">Severity</th>
              <th className="p-3">Type</th>
              <th className="p-3">Message</th>
              <th className="p-3">Created</th>
              <th className="p-3">Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => (
              <tr key={alert.alertId} className="border-t border-slate-700">
                <td className="p-3">
                  <span
                    className={
                      alert.severity === 'CRITICAL'
                        ? 'text-ops-critical'
                        : alert.severity === 'WARNING'
                        ? 'text-ops-warning'
                        : 'text-slate-300'
                    }
                  >
                    {alert.severity}
                  </span>
                </td>
                <td className="p-3">{alert.type}</td>
                <td className="p-3">{alert.message}</td>
                <td className="p-3">{new Date(alert.createdAt).toLocaleTimeString()}</td>
                <td className="p-3">{alert.acknowledged ? 'Acknowledged' : 'Open'}</td>
                <td className="p-3">
                  {!alert.acknowledged ? (
                    <button
                      onClick={() => void acknowledge(alert.alertId)}
                      className="rounded border border-slate-600 px-2 py-1 text-xs hover:bg-slate-800"
                    >
                      Acknowledge
                    </button>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded border border-slate-700 bg-ops-panel p-3">
        <h3 className="text-sm font-semibold">Incident History</h3>
        <p className="mt-1 text-xs text-slate-400">
          Acknowledged incidents: {incidentHistory.length}
        </p>
        {incidentHistory.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">
            No incidents acknowledged yet. Use the Acknowledge action above to move alerts here.
          </p>
        ) : null}
      </div>
    </div>
  );
}
