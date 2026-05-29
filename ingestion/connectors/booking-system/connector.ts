/**
 * Booking connector — Phase 17 lifecycle events to data lake and agent workflows.
 */
import type { BookingLifecycleEvent } from '@airline-ops/shared';

export const bookingConnector = {
  source: 'airline.ops.booking',
  emits: [
    'BookingHeld',
    'BookingCreated',
    'PaymentConfirmed',
    'TicketIssued',
    'BookingCancelled',
    'BookingRefunded',
    'BookingReaccommodated',
    'CommercialOptimizationExecuted',
    'HighPassengerImpactDetected',
  ],

  toCanonicalEvent(event: BookingLifecycleEvent): Record<string, unknown> {
    return {
      source: this.source,
      detailType: event.eventType,
      detail: {
        bookingId: event.bookingId,
        pnr: event.pnr,
        ...event.payload,
        emittedAt: event.emittedAt,
      },
    };
  },
};
