/**
 * Phase 7 — Evaluate thresholds and create alerts / SNS notifications
 */
interface EventBridgeLikeEvent {
  source?: string;
  ['detail-type']?: string;
  detail?: Record<string, unknown>;
}

interface LambdaResponse {
  statusCode: number;
  body: string;
}

export async function handler(event: unknown): Promise<LambdaResponse> {
  const input = event as EventBridgeLikeEvent;
  const type = input['detail-type'] ?? 'UnknownEvent';
  const detail = input.detail ?? {};

  // Threshold routing for notification severity.
  let severity: 'INFO' | 'WARNING' | 'CRITICAL' = 'INFO';
  if (type === 'DelayRiskElevated') {
    const probability = Number(detail.probability ?? 0);
    severity = probability >= 0.85 ? 'CRITICAL' : probability >= 0.7 ? 'WARNING' : 'INFO';
  } else if (type === 'CrewUnavailable') {
    severity = 'CRITICAL';
  } else if (type === 'WeatherRiskDetected') {
    const weatherRisk = Number(detail.riskScore ?? 0);
    severity = weatherRisk >= 0.75 ? 'CRITICAL' : 'WARNING';
  } else if (type === 'BaggageDelayDetected') {
    const delayedBags = Number(detail.delayedBags ?? 0);
    severity = delayedBags >= 40 ? 'CRITICAL' : 'WARNING';
  } else if (type === 'PipelineFailure') {
    severity = 'CRITICAL';
  }

  // Simulated notifications (SNS/email/dashboard webhook target in production).
  console.log('[alert-trigger] received', JSON.stringify({ type, severity, detail }));
  console.log('[alert-trigger] notify:sns', JSON.stringify({ type, severity }));
  if (type === 'PipelineFailure') {
    console.log(
      '[alert-trigger] notify:pagerduty-mock',
      JSON.stringify({ service: 'airline-ops-pipeline', severity, detail })
    );
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, type, severity }),
  };
}
