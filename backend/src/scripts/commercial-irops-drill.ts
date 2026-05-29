/**
 * Phase 18 checkpoint — disrupted flight → best rebook + ancillary retention + impact tracking.
 */
import { randomUUID } from 'crypto';
import { bookingService } from '../services/booking/bookingService';
import { commercialOrchestrator } from '../services/commercial/commercialOrchestrator';
import { commercialEvents } from '../services/commercial/commercialEvents';

const DISRUPTED_FLIGHT = 'FL-20260521-AI302-DEL-BOM';

async function run(): Promise<void> {
  const search = bookingService.search({ origin: 'DEL', destination: 'BOM', passengers: 1 });
  const flight = search.find((row) => row.flightLegId === DISRUPTED_FLIGHT) ?? search[0];
  if (!flight) throw new Error('No flights available');

  const quote = bookingService.fareQuote(flight.flightLegId, 'ECONOMY', 1);
  if (!quote) throw new Error('Fare quote failed');

  const hold = bookingService.createHold({
    flightLegId: flight.flightLegId,
    fareClass: 'ECONOMY',
    passengers: [{ firstName: 'Gold', lastName: 'Member', email: 'loyal.gold@example.com' }],
    seatIds: ['14C'],
    quoteId: quote.quoteId,
  });
  if (!hold) throw new Error('Hold failed');

  const booking = await bookingService.createBookingFromHold(hold.holdId);
  if (!booking) throw new Error('Create booking failed');

  const payment = await bookingService.confirmPayment(booking.bookingId, randomUUID(), '4242');
  if (!payment || payment.payment.status !== 'succeeded') throw new Error('Payment failed');

  const ticketed = await bookingService.issueTickets(booking.bookingId);
  if (!ticketed) throw new Error('Ticketing failed');

  const optimized = await commercialOrchestrator.optimizeDisruption({
    flightLegId: DISRUPTED_FLIGHT,
    pnr: ticketed.booking.pnr,
  });
  if (!optimized) throw new Error('Commercial optimization failed');

  const events = commercialEvents.list(20);
  const checkpointPassed =
    optimized.executed &&
    optimized.booking.status === 'REACCOMMODATED' &&
    optimized.selectedRecommendation.ancillaryRetentionOffers.length > 0 &&
    optimized.impact.netRevenueImpactUsd > 0 &&
    events.some((e) => e.eventType === 'CommercialOptimizationExecuted');

  console.log(
    JSON.stringify(
      {
        ok: checkpointPassed,
        pnr: optimized.pnr,
        rebookedTo: optimized.booking.flightLegId,
        ancillaryCount: optimized.booking.ancillaries.length,
        impact: optimized.impact,
        experiment: optimized.experiment,
      },
      null,
      2
    )
  );

  if (!checkpointPassed) process.exitCode = 1;
}

void run();
