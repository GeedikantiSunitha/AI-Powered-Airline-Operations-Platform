'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DelayPrediction, FlightScenarioPredictions } from '@airline-ops/shared';
import { api } from '@/lib/apiClient';
import { PhasePlaceholder } from '@/components/ui/PhasePlaceholder';

export default function DelayRiskPage() {
  const [predictions, setPredictions] = useState<DelayPrediction[]>([]);
  const [selectedFlightLegId, setSelectedFlightLegId] = useState<string | null>(null);
  const [scenario, setScenario] = useState<FlightScenarioPredictions | null>(null);
  const [loading, setLoading] = useState(true);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getDelayPredictionBatch()
      .then((rows) => {
        setPredictions(rows);
        setSelectedFlightLegId(rows[0]?.flightLegId ?? null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedFlightLegId) {
      setScenario(null);
      return;
    }
    setScenarioLoading(true);
    api
      .getPredictionScenario(selectedFlightLegId)
      .then(setScenario)
      .catch((e) => setError(e.message))
      .finally(() => setScenarioLoading(false));
  }, [selectedFlightLegId]);

  const highestRisk = useMemo(
    () =>
      predictions.reduce(
        (acc, row) => (row.delayProbability > acc.delayProbability ? row : acc),
        predictions[0] ?? null
      ),
    [predictions]
  );

  if (loading) return <p className="text-slate-400">Loading delay predictions…</p>;
  if (error) {
    return (
      <PhasePlaceholder
        title="Flight Delay Risk Dashboard"
        phase={12}
        message={`Prediction API error: ${error}`}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Operations Intelligence (Multi-Model)</h2>
      {highestRisk ? (
        <div className="rounded border border-slate-700 bg-ops-panel p-4">
          <p className="text-sm text-slate-400">Highest delay risk flight</p>
          <p className="text-lg font-semibold">{highestRisk.flightLegId}</p>
          <p
            className={`mt-1 text-sm ${
              highestRisk.delayProbability >= 0.7 ? 'text-ops-critical' : 'text-ops-warning'
            }`}
          >
            Risk {(highestRisk.delayProbability * 100).toFixed(0)}%
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded border border-slate-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-ops-panel text-slate-400">
              <tr>
                <th className="p-3">Flight</th>
                <th className="p-3">Risk</th>
                <th className="p-3">Predicted delay</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((p) => (
                <tr
                  key={p.flightLegId}
                  onClick={() => setSelectedFlightLegId(p.flightLegId)}
                  className={`cursor-pointer border-t border-slate-700 hover:bg-slate-900/60 ${
                    selectedFlightLegId === p.flightLegId ? 'bg-slate-900/80' : ''
                  }`}
                >
                  <td className="p-3">{p.flightLegId}</td>
                  <td className="p-3">{(p.delayProbability * 100).toFixed(0)}%</td>
                  <td className="p-3">{p.predictedDelayMinutes} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded border border-slate-700 bg-ops-panel p-4">
          <h3 className="text-sm font-semibold text-slate-200">Unified scenario predictions</h3>
          {scenarioLoading ? (
            <p className="mt-3 text-sm text-slate-400">Loading multi-model scenario…</p>
          ) : !scenario ? (
            <p className="mt-3 text-sm text-slate-400">Select a flight to inspect all model outputs.</p>
          ) : (
            <div className="mt-3 space-y-3 text-sm">
              {(['delay', 'weather', 'passengerImpact', 'maintenance'] as const).map((key) => {
                const prediction = scenario.predictions[key];
                return (
                  <div key={key} className="rounded border border-slate-700 bg-slate-900/40 p-3">
                    <p className="font-medium text-white">
                      {prediction.model} <span className="text-slate-400">v{prediction.version}</span>
                    </p>
                    <p className="text-slate-400">
                      Confidence {(prediction.confidence * 100).toFixed(0)}%
                    </p>
                    <p className="mt-1 text-slate-300">{prediction.explainability.shapSummary}</p>
                    <ul className="mt-2 space-y-1 text-slate-400">
                      {prediction.explainability.topFactors.slice(0, 3).map((factor) => (
                        <li key={`${key}-${factor.factor}`}>
                          {factor.factor}: {factor.weight}
                          {factor.contributionPct != null ? ` (${factor.contributionPct}%)` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
