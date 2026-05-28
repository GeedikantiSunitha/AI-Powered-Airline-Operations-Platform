/**
 * Phase 7 — Evaluate rules when events arrive (delay risk, crew, weather, baggage)
 */
import { randomUUID } from 'crypto';
import type { Alert, AlertSeverity } from '@airline-ops/shared';
import { broadcast } from '../../websocket/manager';
import { logAudit } from '../../middleware/audit';

type SupportedAlertEventType =
  | 'DelayRiskElevated'
  | 'CrewUnavailable'
  | 'WeatherRiskDetected'
  | 'BaggageDelayDetected';

export interface AlertEventInput {
  type: SupportedAlertEventType;
  flightLegId?: string;
  airportIata?: string;
  probability?: number;
  weatherRiskScore?: number;
  delayedBags?: number;
  message?: string;
}

const alertStore: Alert[] = [];

function createAlert(
  type: string,
  severity: AlertSeverity,
  message: string,
  flightLegId?: string
): Alert {
  const alert: Alert = {
    alertId: randomUUID(),
    type,
    severity,
    flightLegId,
    message,
    createdAt: new Date().toISOString(),
    acknowledged: false,
  };
  alertStore.unshift(alert);
  return alert;
}

async function notify(alert: Alert): Promise<void> {
  // Notification channels placeholder for email/SNS/dashboard.
  console.log('[notify:sns]', JSON.stringify({ alertId: alert.alertId, type: alert.type }));
  await logAudit({
    action: 'alerts.notification_dispatched',
    resource: alert.type,
    metadata: { alertId: alert.alertId, severity: alert.severity, channel: ['sns', 'dashboard'] },
  });
  broadcast({ type: 'alerts.created', payload: alert });
}

export const alertEngine = {
  async evaluateDelayRisk(flightLegId: string, probability: number): Promise<Alert | null> {
    if (probability < 0.7) return null;
    const severity: AlertSeverity = probability >= 0.85 ? 'CRITICAL' : 'WARNING';
    const alert = createAlert(
      'DelayRiskElevated',
      severity,
      `Delay risk ${(probability * 100).toFixed(0)}% for ${flightLegId}`,
      flightLegId
    );
    await notify(alert);
    return alert;
  },

  async evaluateEvent(event: AlertEventInput): Promise<Alert | null> {
    switch (event.type) {
      case 'DelayRiskElevated':
        return this.evaluateDelayRisk(event.flightLegId ?? 'unknown-flight', event.probability ?? 0);
      case 'CrewUnavailable': {
        const alert = createAlert(
          'CrewUnavailable',
          'CRITICAL',
          event.message ?? `Crew unavailable for ${event.flightLegId ?? event.airportIata ?? 'unknown leg'}`,
          event.flightLegId
        );
        await notify(alert);
        return alert;
      }
      case 'WeatherRiskDetected': {
        const risk = event.weatherRiskScore ?? 0;
        const severity: AlertSeverity = risk >= 0.75 ? 'CRITICAL' : 'WARNING';
        const alert = createAlert(
          'WeatherRiskDetected',
          severity,
          event.message ??
            `Weather risk ${(risk * 100).toFixed(0)}% at ${event.airportIata ?? 'unknown airport'}`,
          event.flightLegId
        );
        await notify(alert);
        return alert;
      }
      case 'BaggageDelayDetected': {
        const delayedBags = event.delayedBags ?? 0;
        const severity: AlertSeverity = delayedBags >= 40 ? 'CRITICAL' : 'WARNING';
        const alert = createAlert(
          'BaggageDelayDetected',
          severity,
          event.message ??
            `${delayedBags} delayed bags for ${event.flightLegId ?? event.airportIata ?? 'unknown leg'}`,
          event.flightLegId
        );
        await notify(alert);
        return alert;
      }
      default:
        return null;
    }
  },

  list(): Alert[] {
    return [...alertStore];
  },

  async acknowledge(alertId: string): Promise<Alert | null> {
    const alert = alertStore.find((item) => item.alertId === alertId);
    if (!alert) return null;
    alert.acknowledged = true;
    await logAudit({
      action: 'alerts.acknowledged',
      resource: alert.type,
      metadata: { alertId: alert.alertId },
    });
    broadcast({ type: 'alerts.updated', payload: alert });
    return alert;
  },
};
