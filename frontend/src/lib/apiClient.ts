import type {
  Alert,
  AncillaryOffer,
  BookingRecord,
  CustomerProfile,
  DelayPrediction,
  DisruptionOptimizationResult,
  DynamicFareRecommendation,
  FareClass,
  FareQuote,
  FlightLeg,
  FlightScenarioPredictions,
  FlightSearchResult,
  IropsRecommendation,
  KpiSummary,
  PaymentResult,
  RebookingOption,
  RevenueDashboard,
  SeatMap,
} from '@airline-ops/shared';

export interface BookingConfirmationEmail {
  messageId: string;
  sentTo: string;
  subject: string;
  preview: string;
  sentAt: string;
}

export interface PaymentConfirmResult {
  booking: BookingRecord;
  payment: PaymentResult;
}
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

  async searchFlights(input: {
    origin: string;
    destination: string;
    passengers: number;
  }): Promise<FlightSearchResult[]> {
    const body = await sendJson<{ data: FlightSearchResult[] }>('/api/v1/booking/search', 'POST', input);
    return body.data;
  },

  async getFareQuote(flightLegId: string, fareClass: string, passengers: number): Promise<FareQuote> {
    const body = await fetchJson<{ data: FareQuote }>(
      `/api/v1/booking/fare-quote?flightLegId=${encodeURIComponent(flightLegId)}&fareClass=${fareClass}&passengers=${passengers}`
    );
    return body.data;
  },

  async getSeatMap(flightLegId: string): Promise<SeatMap> {
    const body = await fetchJson<{ data: SeatMap }>(
      `/api/v1/booking/seat-map/${encodeURIComponent(flightLegId)}`
    );
    return body.data;
  },

  async createHold(input: {
    flightLegId: string;
    fareClass: FareClass;
    passengers: Array<{ firstName: string; lastName: string; email: string }>;
    seatIds: string[];
    quoteId: string;
  }): Promise<string> {
    const body = await sendJson<{ data: { holdId: string } }>('/api/v1/booking/hold', 'POST', input);
    return body.data.holdId;
  },

  async createBookingFromHold(holdId: string): Promise<BookingRecord> {
    const body = await sendJson<{ data: BookingRecord }>('/api/v1/booking/create', 'POST', { holdId });
    return body.data;
  },

  async addBookingAncillaries(
    bookingId: string,
    ancillaries: Array<{ code: string; label: string; priceUsd: number }>
  ): Promise<BookingRecord> {
    const body = await sendJson<{ data: BookingRecord }>('/api/v1/booking/ancillaries', 'POST', {
      bookingId,
      ancillaries,
    });
    return body.data;
  },

  async confirmBookingPayment(
    bookingId: string,
    idempotencyKey: string,
    cardNumber: string
  ): Promise<PaymentConfirmResult> {
    const body = await sendJson<{ data: PaymentConfirmResult }>('/api/v1/booking/payment/confirm', 'POST', {
      bookingId,
      idempotencyKey,
      cardNumber,
    });
    return body.data;
  },

  async retryBookingPayment(
    bookingId: string,
    paymentId: string,
    idempotencyKey: string,
    cardNumber: string
  ): Promise<PaymentConfirmResult> {
    const body = await sendJson<{ data: PaymentConfirmResult }>('/api/v1/booking/payment/retry', 'POST', {
      bookingId,
      paymentId,
      idempotencyKey,
      cardNumber,
    });
    return body.data;
  },

  async issueBookingTicket(bookingId: string): Promise<{
    booking: BookingRecord;
    confirmationEmail: BookingConfirmationEmail;
  }> {
    const body = await sendJson<{
      data: { booking: BookingRecord; confirmationEmail: BookingConfirmationEmail };
    }>('/api/v1/booking/ticket/issue', 'POST', { bookingId });
    return body.data;
  },

  async cancelBooking(pnr: string): Promise<BookingRecord> {
    const body = await sendJson<{ data: BookingRecord }>(
      `/api/v1/booking/pnr/${encodeURIComponent(pnr)}/cancel`,
      'POST',
      {}
    );
    return body.data;
  },

  async refundBooking(pnr: string): Promise<BookingRecord> {
    const body = await sendJson<{ data: BookingRecord }>(
      `/api/v1/booking/pnr/${encodeURIComponent(pnr)}/refund`,
      'POST',
      {}
    );
    return body.data;
  },

  async createDemoBooking(email?: string): Promise<BookingRecord> {
    const body = await sendJson<{ data: BookingRecord }>('/api/v1/commercial/demo-booking', 'POST', {
      email,
      flightLegId: 'FL-20260521-AI302-DEL-BOM',
    });
    return body.data;
  },

  async getCrewDashboard() {
    const body = await fetchJson<{
      data: Array<{
        flightLegId: string;
        flightNumber: string;
        status: string;
        delayMinutes: number;
        crew: Array<{ crewMemberId: string; role: string; legal: boolean }>;
        reserveActivationRecommended: boolean;
      }>;
    }>('/api/v1/operations/crew');
    return body.data;
  },

  async getBaggageDashboard() {
    const body = await fetchJson<{
      data: Array<{
        flightLegId: string;
        flightNumber: string;
        bagsLoaded: number;
        bagsDelayed: number;
        avgDelayMinutes: number;
        status: string;
      }>;
    }>('/api/v1/operations/baggage');
    return body.data;
  },

  async getPassengerImpactOps() {
    const body = await fetchJson<{
      data: Array<{
        flightLegId: string;
        flightNumber: string;
        delayMinutes: number;
        prediction: Record<string, unknown>;
        affectedPnrs: string[];
        recommendedAction: string;
      }>;
    }>('/api/v1/operations/passenger-impact');
    return body.data;
  },

  async getPnr(pnr: string): Promise<BookingRecord> {
    const body = await fetchJson<{ data: BookingRecord }>(
      `/api/v1/booking/pnr/${encodeURIComponent(pnr)}`
    );
    return body.data;
  },

  async getRebookOptions(pnr: string): Promise<RebookingOption[]> {
    const body = await fetchJson<{ data: RebookingOption[] }>(
      `/api/v1/booking/disruption/${encodeURIComponent(pnr)}/rebook-options`
    );
    return body.data;
  },

  async executeRebook(pnr: string, optionId: string): Promise<BookingRecord> {
    const body = await sendJson<{ data: BookingRecord }>(
      `/api/v1/booking/disruption/${encodeURIComponent(pnr)}/rebook`,
      'POST',
      { optionId }
    );
    return body.data;
  },

  async getRevenueDashboard(): Promise<RevenueDashboard> {
    const body = await fetchJson<{ data: RevenueDashboard }>('/api/v1/commercial/dashboard/revenue');
    return body.data;
  },

  async getDynamicPricing(flightLegId: string): Promise<DynamicFareRecommendation[]> {
    const body = await fetchJson<{ data: DynamicFareRecommendation[] }>(
      `/api/v1/commercial/pricing/${encodeURIComponent(flightLegId)}`
    );
    return body.data;
  },

  async getAncillaryOffers(customerId: string): Promise<{ offers: AncillaryOffer[]; experiment: { variant: string } | null }> {
    const body = await fetchJson<{ data: AncillaryOffer[]; experiment: { variant: string } | null }>(
      `/api/v1/commercial/offers?customerId=${encodeURIComponent(customerId)}`
    );
    return { offers: body.data, experiment: body.experiment };
  },

  async getCustomerProfile(email: string): Promise<CustomerProfile> {
    const body = await fetchJson<{ data: CustomerProfile }>(
      `/api/v1/commercial/customers/profile?email=${encodeURIComponent(email)}`
    );
    return body.data;
  },

  async getIropsRecommendations(pnr: string): Promise<IropsRecommendation[]> {
    const body = await fetchJson<{ data: IropsRecommendation[] }>(
      `/api/v1/commercial/irops/recommendations/${encodeURIComponent(pnr)}`
    );
    return body.data;
  },

  async optimizeDisruption(flightLegId: string, pnr: string): Promise<DisruptionOptimizationResult> {
    const body = await sendJson<{ data: DisruptionOptimizationResult }>(
      '/api/v1/commercial/irops/optimize',
      'POST',
      { flightLegId, pnr }
    );
    return body.data;
  },
};
