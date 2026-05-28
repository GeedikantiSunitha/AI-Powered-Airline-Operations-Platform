import type {
  FeatureAttribution,
  ModelExplainability,
  UnifiedModelPrediction,
} from '@airline-ops/shared';

export function buildExplainability(
  factors: Array<{ factor: string; weight: number }>,
  shapSummary: string
): ModelExplainability {
  const total = factors.reduce((sum, row) => sum + Math.abs(row.weight), 0) || 1;
  const topFactors: FeatureAttribution[] = factors.map((row) => ({
    factor: row.factor,
    weight: row.weight,
    contributionPct: Number(((Math.abs(row.weight) / total) * 100).toFixed(1)),
  }));
  return { topFactors, shapSummary };
}

export function wrapPrediction<TOutput>(input: {
  model: UnifiedModelPrediction<TOutput>['model'];
  version: string;
  flightLegId?: string;
  aircraftRegistration?: string;
  confidence: number;
  features: Record<string, number | string | boolean>;
  output: TOutput;
  factors: Array<{ factor: string; weight: number }>;
  shapSummary: string;
}): UnifiedModelPrediction<TOutput> {
  return {
    model: input.model,
    version: input.version,
    flightLegId: input.flightLegId,
    aircraftRegistration: input.aircraftRegistration,
    predictedAt: new Date().toISOString(),
    confidence: Number(input.confidence.toFixed(2)),
    features: input.features,
    output: input.output,
    explainability: buildExplainability(input.factors, input.shapSummary),
  };
}
