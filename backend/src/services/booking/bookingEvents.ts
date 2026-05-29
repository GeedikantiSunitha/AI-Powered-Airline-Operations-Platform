import type { BookingLifecycleEvent } from '@airline-ops/shared';

const eventBuffer: BookingLifecycleEvent[] = [];

export const bookingEvents = {
  emit(eventType: string, bookingId: string, pnr: string, payload: Record<string, unknown>): BookingLifecycleEvent {
    const event: BookingLifecycleEvent = {
      eventType,
      bookingId,
      pnr,
      payload,
      emittedAt: new Date().toISOString(),
    };
    eventBuffer.unshift(event);
    console.log('[booking-event]', JSON.stringify(event));
    return event;
  },

  list(bookingId?: string): BookingLifecycleEvent[] {
    return eventBuffer.filter((row) => !bookingId || row.bookingId === bookingId);
  },
};
