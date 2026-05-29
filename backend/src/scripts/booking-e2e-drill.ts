/**
 * Phase 17 checkpoint — search → pay → ticket + disruption rebooking.
 */
import { bookingService } from '../services/booking/bookingService';
import { bookingEvents } from '../services/booking/bookingEvents';
import { randomUUID } from 'crypto';

async function run(): Promise<void> {
  const search = bookingService.search({ origin: 'DEL', destination: 'BOM', passengers: 1 });
  const flight = search[0];
  if (!flight) throw new Error('No flights in search results');

  const quote = bookingService.fareQuote(flight.flightLegId, 'ECONOMY', 1);
  if (!quote) throw new Error('Fare quote failed');

  const hold = bookingService.createHold({
    flightLegId: flight.flightLegId,
    fareClass: 'ECONOMY',
    passengers: [{ firstName: 'Test', lastName: 'Passenger', email: 'test@example.com' }],
    seatIds: ['12A'],
    quoteId: quote.quoteId,
  });
  if (!hold) throw new Error('Hold failed');

  const booking = await bookingService.createBookingFromHold(hold.holdId);
  if (!booking) throw new Error('Create booking failed');

  const payment = await bookingService.confirmPayment(booking.bookingId, randomUUID(), '4242');
  if (!payment || payment.payment.status !== 'succeeded') throw new Error('Payment failed');

  const ticketed = await bookingService.issueTickets(booking.bookingId);
  if (!ticketed || ticketed.booking.status !== 'TICKETED') throw new Error('Ticketing failed');

  const rebookOptions = bookingService.getRebookingOptions(ticketed.booking.pnr);
  const rebooked = await bookingService.reaccommodate(
    ticketed.booking.bookingId,
    rebookOptions[0]?.optionId ?? '',
    rebookOptions
  );

  const events = bookingEvents.list(ticketed.booking.bookingId);
  const checkpointPassed =
    Boolean(ticketed?.booking.ticketNumbers.length) &&
    rebooked?.status === 'REACCOMMODATED' &&
    events.some((e) => e.eventType === 'TicketIssued') &&
    events.some((e) => e.eventType === 'BookingReaccommodated');

  console.log(
    JSON.stringify(
      {
        ok: checkpointPassed,
        pnr: ticketed?.booking.pnr,
        ticketNumbers: ticketed?.booking.ticketNumbers,
        rebookedTo: rebooked?.flightLegId,
        eventTypes: events.map((e) => e.eventType),
      },
      null,
      2
    )
  );

  if (!checkpointPassed) process.exitCode = 1;
}

void run();
