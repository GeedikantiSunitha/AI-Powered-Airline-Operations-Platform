'use client';

import { useEffect, useMemo, useState } from 'react';
import type { KpiSummary } from '@airline-ops/shared';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { api } from '@/lib/apiClient';
import { PhasePlaceholder } from '@/components/ui/PhasePlaceholder';

type KpiTrend = { date: string; otpPct: number; avgDelayMinutes: number; cancellations: number };

export default function KpiPage() {
  const [days, setDays] = useState(7);
  const [summary, setSummary] = useState<KpiSummary | null>(null);
  const [trends, setTrends] = useState<KpiTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([api.getKpiSummary(days), api.getKpiTrends(days)])
      .then(([s, t]) => {
        setSummary(s);
        setTrends(t);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [days]);

  const cards = useMemo(
    () =>
      summary
        ? [
            { label: 'OTP %', value: summary.onTimePerformancePct.toFixed(2) },
            { label: 'Avg Delay (min)', value: summary.avgDelayMinutes.toFixed(2) },
            { label: 'Cancellation %', value: summary.cancellationRatePct.toFixed(2) },
            { label: 'Baggage Delay %', value: summary.baggageDelayRatePct.toFixed(2) },
            { label: 'Crew Utilization %', value: summary.crewUtilizationPct.toFixed(2) },
            { label: 'Fuel Efficiency %', value: summary.fuelEfficiencyPct.toFixed(2) },
          ]
        : [],
    [summary]
  );

  if (loading) return <p className="text-slate-400">Loading KPI analytics…</p>;
  if (error || !summary) {
    return (
      <PhasePlaceholder
        title="KPI Analytics"
        phase={5}
        message={`KPI API not ready: ${error ?? 'no summary data'}`}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Operational KPI Dashboard</h2>
        <div className="flex items-center gap-2 text-sm">
          <label htmlFor="kpi-days" className="text-slate-400">
            Date range
          </label>
          <select
            id="kpi-days"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded border border-slate-700 bg-ops-panel p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded border border-slate-700 bg-ops-panel p-3">
          <h3 className="mb-2 text-sm font-semibold text-slate-200">OTP trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="otpPct" name="OTP %" stroke="#38bdf8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded border border-slate-700 bg-ops-panel p-3">
          <h3 className="mb-2 text-sm font-semibold text-slate-200">Delay vs cancellations</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgDelayMinutes" name="Avg Delay (min)" fill="#fbbf24" />
                <Bar dataKey="cancellations" name="Cancellations" fill="#f87171" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
