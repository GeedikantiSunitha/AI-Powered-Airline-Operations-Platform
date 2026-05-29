import { randomUUID } from 'crypto';
import type {
  BookingHold,
  BookingRecord,
  FareClass,
  FareQuote,
  PassengerDetail,
  RebookingOption,
} from '@airline-ops/shared';
import { mockFlights } from '../../data/mockFlights';
import { flightInventory } from '../../data/mockInventory';
import { inventoryService } from './inventoryService';
import { paymentGateway } from './paymentGateway';
import { bookingEvents } from './bookingEvents';
import { pricingEngine } from '../commercial/pricingEngine';
import { funnelMetrics } from '../commercial/funnelMetrics';
import { bookingPersistence } from './bookingPersistence';
import { notificationService } from './notificationService';

const holds = new Map<string, BookingHold>();
const bookings = new Map<string, BookingRecord>();
const quotes = new Map<string, FareQuote>();

async function saveBooking(booking: BookingRecord): Promise<void> {
  bookings.set(booking.bookingId, booking);
  await bookingPersistence.upsert(booking);
}

function generatePnr(): string {
  return `PNR${randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

function generateTicket(): string {
  return `TKT${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

export const bookingService = {
  async hydrateFromDatabase(): Promise<number> {
    const rows = await bookingPersistence.loadAll();
    for (const booking of rows) {
      bookings.set(booking.bookingId, booking);
    }
    return rows.length;
  },

  search(input: { origin: string; destination: string; passengers: number }) {
    funnelMetrics.record('searches');
    return inventoryService.search(input);
  },

  fareQuote(flightLegId: string, fareClass: FareClass, passengers: number): FareQuote | null {
    const inv = flightInventory[flightLegId];
    if (!inv || inv.fares[fareClass].available < passengers) return null;
    funnelMetrics.record('quotes');
    const dynamic = pricingEngine.computeFare(flightLegId, fareClass, passengers);
    const base = dynamic?.recommendedFareUsd ?? inv.fares[fareClass].baseUsd * passengers;
    const taxes = Number((base * 0.12).toFixed(2));
    const quote: FareQuote = {
      quoteId: randomUUID(),
      flightLegId,
      fareClass,
      baseFareUsd: base,
      taxesUsd: taxes,
      totalUsd: base + taxes,
      currency: 'USD',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
    quotes.set(quote.quoteId, quote);
    return quote;
  },

  createHold(input: {
    flightLegId: string;
    fareClass: FareClass;
    passengers: PassengerDetail[];
    seatIds: string[];
    quoteId?: string;
  }): BookingHold | null {
    const quote = input.quoteId ? quotes.get(input.quoteId) : null;
    const inv = flightInventory[input.flightLegId];
    if (!inv) return null;
    if (!inventoryService.reserveSeats(input.flightLegId, input.seatIds, input.fareClass)) {
      return null;
    }
    const baseTotal =
      quote?.totalUsd ??
      inv.fares[input.fareClass].baseUsd * input.passengers.length * 1.12;
    const hold: BookingHold = {
      holdId: randomUUID(),
      flightLegId: input.flightLegId,
      fareClass: input.fareClass,
      passengers: input.passengers,
      seatIds: input.seatIds,
      expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      totalUsd: Number(baseTotal.toFixed(2)),
    };
    holds.set(hold.holdId, hold);
    funnelMetrics.record('holds');
    bookingEvents.emit('BookingHeld', hold.holdId, 'PENDING', {
      flightLegId: input.flightLegId,
      seatIds: input.seatIds,
    });
    return hold;
  },

  async createBookingFromHold(holdId: string): Promise<BookingRecord | null> {
    const hold = holds.get(holdId);
    if (!hold || new Date(hold.expiresAt) < new Date()) return null;
    const booking: BookingRecord = {
      bookingId: randomUUID(),
      pnr: generatePnr(),
      status: 'PENDING_PAYMENT',
      flightLegId: hold.flightLegId,
      fareClass: hold.fareClass,
      passengers: hold.passengers,
      seatIds: hold.seatIds,
      ancillaries: [],
      totalUsd: hold.totalUsd,
      ticketNumbers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveBooking(booking);
    holds.delete(holdId);
    funnelMetrics.record('bookings');
    bookingEvents.emit('BookingCreated', booking.bookingId, booking.pnr, {
      status: booking.status,
      totalUsd: booking.totalUsd,
    });
    return booking;
  },

  async confirmPayment(
    bookingId: string,
    idempotencyKey: string,
    cardLast4?: string
  ): Promise<{ booking: BookingRecord; payment: Awaited<ReturnType<typeof paymentGateway.charge>> } | null> {
    const booking = bookings.get(bookingId);
    if (!booking || booking.status !== 'PENDING_PAYMENT') return null;
    const payment = await paymentGateway.charge({
      amountUsd: booking.totalUsd,
      idempotencyKey,
      cardLast4,
    });
    if (payment.status !== 'succeeded') {
      bookingEvents.emit('PaymentFailed', bookingId, booking.pnr, { payment });
      return { booking, payment };
    }
    booking.paymentId = payment.paymentId;
    booking.status = 'CONFIRMED';
    booking.updatedAt = new Date().toISOString();
    await saveBooking(booking);
    bookingEvents.emit('PaymentConfirmed', bookingId, booking.pnr, { paymentId: payment.paymentId });
    return { booking, payment };
  },

  async retryPayment(
    bookingId: string,
    paymentId: string,
    idempotencyKey: string,
    cardLast4?: string
  ): Promise<{ booking: BookingRecord; payment: Awaited<ReturnType<typeof paymentGateway.retry>> } | null> {
    const booking = bookings.get(bookingId);
    if (!booking || booking.status !== 'PENDING_PAYMENT') return null;
    const payment = await paymentGateway.retry(paymentId, idempotencyKey);
    if (payment.status === 'succeeded') {
      booking.paymentId = payment.paymentId;
      booking.status = 'CONFIRMED';
      booking.updatedAt = new Date().toISOString();
      await saveBooking(booking);
      bookingEvents.emit('PaymentConfirmed', bookingId, booking.pnr, { paymentId: payment.paymentId });
    }
    return { booking, payment };
  },

  async issueTickets(bookingId: string): Promise<{
    booking: BookingRecord;
    confirmationEmail: ReturnType<typeof notificationService.sendBookingConfirmation>;
  } | null> {
    const booking = bookings.get(bookingId);
    if (!booking || booking.status !== 'CONFIRMED') return null;
    booking.ticketNumbers = booking.passengers.map(() => generateTicket());
    booking.status = 'TICKETED';
    booking.updatedAt = new Date().toISOString();
    await saveBooking(booking);
    funnelMetrics.record('tickets');
    bookingEvents.emit('TicketIssued', bookingId, booking.pnr, {
      ticketNumbers: booking.ticketNumbers,
    });
    const confirmationEmail = notificationService.sendBookingConfirmation(booking);
    return { booking, confirmationEmail };
  },

  getByPnr(pnr: string): BookingRecord | null {
    return [...bookings.values()].find((b) => b.pnr === pnr) ?? null;
  },

  getById(bookingId: string): BookingRecord | null {
    return bookings.get(bookingId) ?? null;
  },

  listBookings(): BookingRecord[] {
    return [...bookings.values()];
  },

  async addAncillaries(
    bookingId: string,
    ancillaries: Array<{ code: string; label: string; priceUsd: number }>
  ): Promise<BookingRecord | null> {
    const booking = bookings.get(bookingId);
    if (!booking) return null;
    booking.ancillaries.push(...ancillaries);
    booking.totalUsd += ancillaries.reduce((sum, row) => sum + row.priceUsd, 0);
    booking.updatedAt = new Date().toISOString();
    await saveBooking(booking);
    return booking;
  },

  async changeItinerary(bookingId: string, newFlightLegId: string): Promise<BookingRecord | null> {
    const booking = bookings.get(bookingId);
    if (!booking || booking.status === 'CANCELLED') return null;
    inventoryService.releaseSeats(booking.flightLegId, booking.seatIds.length);
    booking.flightLegId = newFlightLegId;
    inventoryService.reserveSeats(newFlightLegId, booking.seatIds, booking.fareClass);
    booking.updatedAt = new Date().toISOString();
    bookingEvents.emit('ItineraryChanged', bookingId, booking.pnr, { newFlightLegId });
    await saveBooking(booking);
    return booking;
  },

  async cancel(bookingId: string): Promise<BookingRecord | null> {
    const booking = bookings.get(bookingId);
    if (!booking) return null;
    inventoryService.releaseSeats(booking.flightLegId, booking.seatIds.length);
    booking.status = 'CANCELLED';
    booking.updatedAt = new Date().toISOString();
    bookingEvents.emit('BookingCancelled', bookingId, booking.pnr, {});
    await saveBooking(booking);
    return booking;
  },

  async refund(bookingId: string): Promise<BookingRecord | null> {
    const booking = bookings.get(bookingId);
    if (!booking || booking.status === 'REFUNDED') return null;
    booking.status = 'REFUNDED';
    booking.updatedAt = new Date().toISOString();
    bookingEvents.emit('BookingRefunded', bookingId, booking.pnr, { amountUsd: booking.totalUsd });
    await saveBooking(booking);
    return booking;
  },

  getRebookingOptions(pnr: string): RebookingOption[] {
    const booking = this.getByPnr(pnr);
    if (!booking) return [];
    const disruptedFlight = mockFlights.find((f) => f.flightLegId === booking.flightLegId);
    const delayMinutes = disruptedFlight?.delayMinutes ?? 0;
    return mockFlights
      .filter(
        (f) =>
          f.flightLegId !== booking.flightLegId &&
          f.origin === disruptedFlight?.origin &&
          f.status !== 'CANCELLED'
      )
      .slice(0, 3)
      .map((flight) => ({
        optionId: randomUUID(),
        flightLegId: flight.flightLegId,
        flightNumber: flight.flightNumber,
        policy: delayMinutes >= 45 ? 'Duty of care + free rebooking' : 'Same-day change fee waived',
        compensationUsd: delayMinutes >= 45 ? 75 : 0,
        departure: flight.scheduledDeparture,
      }));
  },

  async reaccommodate(
    bookingId: string,
    optionId: string,
    options: RebookingOption[]
  ): Promise<BookingRecord | null> {
    const booking = bookings.get(bookingId);
    const option = options.find((row) => row.optionId === optionId);
    if (!booking || !option) return null;
    await this.changeItinerary(bookingId, option.flightLegId);
    booking.status = 'REACCOMMODATED';
    booking.updatedAt = new Date().toISOString();
    await saveBooking(booking);
    bookingEvents.emit('BookingReaccommodated', bookingId, booking.pnr, {
      optionId,
      policy: option.policy,
      compensationUsd: option.compensationUsd,
    });
    return booking;
  },

  async createDemoTicketedBooking(input?: {
    flightLegId?: string;
    email?: string;
  }): Promise<BookingRecord | null> {
    const flightLegId = input?.flightLegId ?? 'FL-20260521-AI302-DEL-BOM';
    const quote = this.fareQuote(flightLegId, 'ECONOMY', 1);
    if (!quote) return null;
    const hold = this.createHold({
      flightLegId,
      fareClass: 'ECONOMY',
      passengers: [
        {
          firstName: 'Demo',
          lastName: 'Traveler',
          email: input?.email ?? 'loyal.gold@example.com',
        },
      ],
      seatIds: ['15A'],
      quoteId: quote.quoteId,
    });
    if (!hold) return null;
    const booking = await this.createBookingFromHold(hold.holdId);
    if (!booking) return null;
    const payment = await this.confirmPayment(booking.bookingId, randomUUID(), '4242');
    if (!payment || payment.payment.status !== 'succeeded') return null;
    const ticketed = await this.issueTickets(booking.bookingId);
    return ticketed?.booking ?? null;
  },
};
