import type { RevenueDashboard } from '@airline-ops/shared';
import { mockFlights } from '../../data/mockFlights';
import { bookingService } from '../booking/bookingService';
import { commercialEvents } from './commercialEvents';
import { funnelMetrics } from './funnelMetrics';

const optimizations: RevenueDashboard['recentOptimizations'] = [];

export const revenueDashboard = {
  recordOptimization(pnr: string, netRevenueImpactUsd: number, cxScoreDelta: number): void {
    optimizations.unshift({
      pnr,
      netRevenueImpactUsd,
      cxScoreDelta,
      executedAt: new Date().toISOString(),
    });
    if (optimizations.length > 20) optimizations.pop();
  },

  getDashboard(): RevenueDashboard {
    const bookings = bookingService.listBookings();
    const grossBookingUsd = bookings.reduce((sum, b) => sum + b.totalUsd, 0);
    const ancillaryUsd = bookings.reduce(
      (sum, b) => sum + b.ancillaries.reduce((s, a) => s + a.priceUsd, 0),
      0
    );
    const refundsUsd = bookings
      .filter((b) => b.status === 'REFUNDED')
      .reduce((sum, b) => sum + b.totalUsd, 0);

    const tickets = bookings.filter((b) => b.ticketNumbers.length > 0).length;
    const funnel = funnelMetrics.snapshot();
    funnel.tickets = Math.max(funnel.tickets, tickets);
    funnel.bookings = Math.max(funnel.bookings, bookings.length);

    const conversionRatePct =
      funnel.searches > 0
        ? Number(((funnel.tickets / funnel.searches) * 100).toFixed(1))
        : tickets > 0
          ? 100
          : 0;

    return {
      funnel: {
        searches: funnel.searches,
        quotes: funnel.quotes,
        holds: funnel.holds,
        bookings: funnel.bookings,
        tickets: funnel.tickets,
        conversionRatePct,
      },
      revenue: {
        grossBookingUsd: Number(grossBookingUsd.toFixed(2)),
        ancillaryUsd: Number(ancillaryUsd.toFixed(2)),
        refundsUsd: Number(refundsUsd.toFixed(2)),
        netUsd: Number((grossBookingUsd + ancillaryUsd - refundsUsd).toFixed(2)),
      },
      operationalConstraints: mockFlights
        .filter((f) => f.status === 'DELAYED' || f.status === 'CANCELLED' || (f.delayMinutes ?? 0) > 0)
        .map((f) => ({
          flightLegId: f.flightLegId,
          flightNumber: f.flightNumber,
          status: f.status,
          delayMinutes: f.delayMinutes ?? 0,
          estimatedConversionImpactPct: Math.min(40, (f.delayMinutes ?? 0) * 0.6),
        })),
      recentOptimizations: optimizations,
    };
  },

  seedFromEvents(): void {
    const commercial = commercialEvents.list(100);
    for (const evt of commercial) {
      if (evt.eventType === 'CommercialOptimizationExecuted') {
        optimizations.unshift({
          pnr: String(evt.pnr ?? ''),
          netRevenueImpactUsd: Number(evt.payload.netRevenueImpactUsd ?? 0),
          cxScoreDelta: Number(evt.payload.cxScoreDelta ?? 0),
          executedAt: evt.emittedAt,
        });
      }
    }
  },
};
