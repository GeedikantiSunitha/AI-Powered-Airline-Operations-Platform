import type {
  Alert,
  DelayPrediction,
  FlightLeg,
  FlightScenarioPredictions,
  KpiSummary,
} from '@airline-ops/shared';
import { clearSession, getToken } from './authSession';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchJson<T>(path: string): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) {
    clearSession();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function sendJson<T>(path: string, method: 'POST' | 'PATCH', body: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    clearSession();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export interface AdminUser {
  username: string;
  role: 'admin' | 'operations_manager' | 'crew_manager' | 'analyst' | 'viewer';
  status: 'active' | 'disabled';
}

export interface AlertRule {
  ruleId: string;
  type: 'DelayRiskElevated' | 'CrewUnavailable' | 'WeatherRiskDetected' | 'BaggageDelayDetected';
  enabled: boolean;
  threshold: number;
}

export const api = {
  async getFlights(): Promise<FlightLeg[]> {
    const body = await fetchJson<{ data: FlightLeg[] }>('/api/v1/flights');
    return body.data;
  },

  async getFlight(id: string): Promise<FlightLeg> {
    const body = await fetchJson<{ data: FlightLeg }>(`/api/v1/flights/${id}`);
    return body.data;
  },

  async simulateDelay(flightLegId: string, delayMinutes: number): Promise<FlightLeg> {
    const token = getToken();
    const res = await fetch(`${BASE}/api/v1/flights/simulate-delay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ flightLegId, delayMinutes }),
    });
    if (res.status === 401) {
      clearSession();
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const body = (await res.json()) as { data: FlightLeg };
    return body.data;
  },

  async getKpiSummary(days = 7): Promise<KpiSummary> {
    const body = await fetchJson<{ data: KpiSummary }>(`/api/v1/kpi/summary?days=${days}`);
    return body.data;
  },

  async getKpiTrends(days = 7): Promise<
    Array<{ date: string; otpPct: number; avgDelayMinutes: number; cancellations: number }>
  > {
    const body = await fetchJson<{
      data: Array<{ date: string; otpPct: number; avgDelayMinutes: number; cancellations: number }>;
    }>(`/api/v1/kpi/trends?days=${days}`);
    return body.data;
  },

  async getDelayPrediction(flightLegId: string): Promise<DelayPrediction> {
    const body = await fetchJson<{ data: DelayPrediction }>(
      `/api/v1/predictions/delay?flightLegId=${encodeURIComponent(flightLegId)}`
    );
    return body.data;
  },

  async getDelayPredictionBatch(): Promise<DelayPrediction[]> {
    const body = await fetchJson<{ data: DelayPrediction[] }>(`/api/v1/predictions/delay/batch`);
    return body.data;
  },

  async getPredictionScenario(flightLegId: string): Promise<FlightScenarioPredictions> {
    const body = await fetchJson<{ data: FlightScenarioPredictions }>(
      `/api/v1/predictions/scenario?flightLegId=${encodeURIComponent(flightLegId)}`
    );
    return body.data;
  },

  async getAlerts(): Promise<Alert[]> {
    const body = await fetchJson<{ data: Alert[] }>(`/api/v1/alerts`);
    return body.data;
  },

  async acknowledgeAlert(alertId: string): Promise<Alert> {
    const token = getToken();
    const res = await fetch(`${BASE}/api/v1/alerts/acknowledge/${encodeURIComponent(alertId)}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.status === 401) {
      clearSession();
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const body = (await res.json()) as { data: Alert };
    return body.data;
  },

  async injectTestAlert(input: {
    type: 'DelayRiskElevated' | 'CrewUnavailable' | 'WeatherRiskDetected' | 'BaggageDelayDetected';
    flightLegId?: string;
    airportIata?: string;
    probability?: number;
    weatherRiskScore?: number;
    delayedBags?: number;
    message?: string;
  }): Promise<Alert> {
    const token = getToken();
    const res = await fetch(`${BASE}/api/v1/alerts/test-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(input),
    });
    if (res.status === 401) {
      clearSession();
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const body = (await res.json()) as { data: Alert };
    return body.data;
  },

  async copilotChat(input: {
    message: string;
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
  }): Promise<{
    message: { role: 'assistant'; content: string; confidence?: number };
    sources: Array<{ source: string; reference: string }>;
  }> {
    const token = getToken();
    const res = await fetch(`${BASE}/api/v1/copilot/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(input),
    });
    if (res.status === 401) {
      clearSession();
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const body = (await res.json()) as {
      data: {
        message: { role: 'assistant'; content: string; confidence?: number };
        sources: Array<{ source: string; reference: string }>;
      };
    };
    return body.data;
  },

  async getAdminUsers(): Promise<AdminUser[]> {
    const body = await fetchJson<{ data: AdminUser[] }>('/api/v1/admin/users');
    return body.data;
  },

  async createAdminUser(input: {
    username: string;
    role: AdminUser['role'];
  }): Promise<AdminUser> {
    const body = await sendJson<{ data: AdminUser }>('/api/v1/admin/users', 'POST', input);
    return body.data;
  },

  async updateAdminUser(
    username: string,
    input: { role?: AdminUser['role']; status?: AdminUser['status'] }
  ): Promise<AdminUser> {
    const body = await sendJson<{ data: AdminUser }>(
      `/api/v1/admin/users/${encodeURIComponent(username)}`,
      'PATCH',
      input
    );
    return body.data;
  },

  async getAlertRules(): Promise<AlertRule[]> {
    const body = await fetchJson<{ data: AlertRule[] }>('/api/v1/admin/alert-rules');
    return body.data;
  },

  async updateAlertRule(
    ruleId: string,
    input: { enabled?: boolean; threshold?: number }
  ): Promise<AlertRule> {
    const body = await sendJson<{ data: AlertRule }>(
      `/api/v1/admin/alert-rules/${encodeURIComponent(ruleId)}`,
      'PATCH',
      input
    );
    return body.data;
  },

  async getSreDashboard(): Promise<{
    slo: { met: boolean; snapshot: Record<string, number> };
    widgets: Record<string, Record<string, string | number>>;
    activeAlerts: Array<{ ruleId: string; message: string; severity: string }>;
    syntheticChecks: Array<{ journey: string; passed: boolean; latencyMs: number }>;
  }> {
    const body = await fetchJson<{ data: {
      slo: { met: boolean; snapshot: Record<string, number> };
      widgets: Record<string, Record<string, string | number>>;
      activeAlerts: Array<{ ruleId: string; message: string; severity: string }>;
      syntheticChecks: Array<{ journey: string; passed: boolean; latencyMs: number }>;
    } }>('/api/v1/sre/dashboard');
    return body.data;
  },
};
