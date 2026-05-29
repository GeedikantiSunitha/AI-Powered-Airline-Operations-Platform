'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type {
  DisruptionOptimizationResult,
  DynamicFareRecommendation,
  RevenueDashboard,
} from '@airline-ops/shared';
import { api } from '@/lib/apiClient';

const DISRUPTED_FLIGHT = 'FL-20260521-AI302-DEL-BOM';

export default function CommercialPage() {
  const searchParams = useSearchParams();
  const [dashboard, setDashboard] = useState<RevenueDashboard | null>(null);
  const [pricing, setPricing] = useState<DynamicFareRecommendation[]>([]);
  const [pnr, setPnr] = useState(searchParams.get('pnr') ?? '');
  const [demoPnr, setDemoPnr] = useState<string | null>(null);
  const [result, setResult] = useState<DisruptionOptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([api.getRevenueDashboard(), api.getDynamicPricing(DISRUPTED_FLIGHT)])
      .then(([dash, fares]) => {
        setDashboard(dash);
        setPricing(fares);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Load failed'));
  }, []);

  async function createDemoBooking() {
    setLoading(true);
    setError(null);
    try {
      const booking = await api.createDemoBooking('loyal.gold@example.com');
      setDemoPnr(booking.pnr);
      setPnr(booking.pnr);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Demo booking failed');
    } finally {
      setLoading(false);
    }
  }

  async function runOptimization() {
    if (!pnr) return;
    setLoading(true);
    setError(null);
    try {
      const optimized = await api.optimizeDisruption(DISRUPTED_FLIGHT, pnr);
      setResult(optimized);
      setDashboard(await api.getRevenueDashboard());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Optimization failed');
    } finally {
      setLoading(false);
    }
  }

  if (!dashboard) {
    return <p className="text-slate-400">{error ? error : 'Loading commercial dashboard…'}</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Commercial Optimization</h2>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded border border-slate-700 bg-ops-panel p-4 text-sm">
          <p className="font-medium text-slate-200">Booking funnel</p>
          <p className="mt-2 text-slate-400">Searches: {dashboard.funnel.searches}</p>
          <p className="text-slate-400">Tickets: {dashboard.funnel.tickets}</p>
          <p className="text-emerald-400">Conversion: {dashboard.funnel.conversionRatePct}%</p>
        </div>
        <div className="rounded border border-slate-700 bg-ops-panel p-4 text-sm">
          <p className="font-medium text-slate-200">Revenue</p>
          <p className="mt-2 text-slate-400">Gross: ${dashboard.revenue.grossBookingUsd}</p>
          <p className="text-slate-400">Ancillary: ${dashboard.revenue.ancillaryUsd}</p>
          <p className="text-emerald-400">Net: ${dashboard.revenue.netUsd}</p>
        </div>
        <div className="rounded border border-slate-700 bg-ops-panel p-4 text-sm">
          <p className="font-medium text-slate-200">Ops constraints</p>
          {dashboard.operationalConstraints.slice(0, 2).map((row) => (
            <p key={row.flightLegId} className="mt-2 text-slate-400">
              {row.flightNumber} · {row.delayMinutes}m delay · −{row.estimatedConversionImpactPct}%
              conversion
            </p>
          ))}
        </div>
      </div>

      <div className="rounded border border-slate-700 bg-ops-panel p-4">
        <h3 className="text-sm font-semibold text-slate-200">Dynamic pricing (AI-302 DEL→BOM)</h3>
        <table className="mt-2 w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="p-2">Class</th>
              <th className="p-2">Load</th>
              <th className="p-2">Multiplier</th>
              <th className="p-2">Fare</th>
            </tr>
          </thead>
          <tbody>
            {pricing.map((row) => (
              <tr key={row.fareClass} className="border-t border-slate-800">
                <td className="p-2">{row.fareClass}</td>
                <td className="p-2">{row.loadFactorPct}%</td>
                <td className="p-2">{row.priceMultiplier}</td>
                <td className="p-2">${row.recommendedFareUsd}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded border border-amber-900/50 bg-amber-950/20 p-4">
        <h3 className="text-sm font-semibold text-amber-200">IROPS optimization (disrupted flight)</h3>
        <p className="mt-1 text-xs text-slate-400">
          Enter a ticketed PNR on AI-302 (DEL→BOM) or create a demo booking, then optimize.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={createDemoBooking}
            disabled={loading}
            className="rounded border border-amber-700 px-3 py-2 text-sm text-amber-200 hover:bg-amber-950"
          >
            Create demo booking
          </button>
          {demoPnr ? <span className="self-center text-xs text-emerald-400">Demo PNR: {demoPnr}</span> : null}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            value={pnr}
            onChange={(e) => setPnr(e.target.value.toUpperCase())}
            placeholder="PNR"
          />
          <button
            onClick={runOptimization}
            disabled={loading}
            className="rounded bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-500 disabled:opacity-50"
          >
            Optimize
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-ops-critical">{error}</p> : null}
        {result ? (
          <div className="mt-3 text-sm text-slate-300">
            <p>Rebooked to: {result.booking.flightLegId}</p>
            <p>Ancillaries retained: {result.booking.ancillaries.length}</p>
            <p>Net revenue impact: ${result.impact.netRevenueImpactUsd}</p>
            <p>CX delta: +{result.impact.cxScoreDelta}</p>
            <p className="text-xs text-slate-500">
              Experiment: {result.experiment.experimentId} / {result.experiment.variant}
            </p>
          </div>
        ) : null}
      </div>

      {dashboard.recentOptimizations.length > 0 ? (
        <div className="rounded border border-slate-700 p-4 text-sm">
          <h3 className="font-semibold text-slate-200">Recent optimizations</h3>
          <ul className="mt-2 space-y-1 text-slate-400">
            {dashboard.recentOptimizations.map((row) => (
              <li key={`${row.pnr}-${row.executedAt}`}>
                {row.pnr} · ${row.netRevenueImpactUsd} net · CX +{row.cxScoreDelta}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
