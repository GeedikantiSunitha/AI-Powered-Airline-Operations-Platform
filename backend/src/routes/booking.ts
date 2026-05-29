import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { logAudit } from '../middleware/audit';
import { bookingService } from '../services/booking/bookingService';
import { inventoryService } from '../services/booking/inventoryService';
import { bookingEvents } from '../services/booking/bookingEvents';
import type { FareClass, UserRole } from '@airline-ops/shared';

export const bookingRouter = Router();
const bookingRoles: UserRole[] = [
  'admin',
  'operations_manager',
  'analyst',
  'viewer',
  'crew_manager',
];
bookingRouter.use(requireAuth, requireRole(...bookingRoles));

function cardLast4FromBody(body: Record<string, unknown>): string | undefined {
  const raw = String(body?.cardNumber ?? body?.cardLast4 ?? '').replace(/\D/g, '');
  if (raw.length >= 4) return raw.slice(-4);
  return undefined;
}

/** POST /api/v1/booking/search */
bookingRouter.post('/search', (req, res) => {
  const origin = String(req.body?.origin ?? '').toUpperCase();
  const destination = String(req.body?.destination ?? '').toUpperCase();
  const passengers = Math.max(1, Number(req.body?.passengers ?? 1));
  if (!origin || !destination) {
    res.status(400).json({ error: 'ValidationError', message: 'origin and destination are required' });
    return;
  }
  const data = bookingService.search({ origin, destination, passengers });
  res.json({ data });
});

/** GET /api/v1/booking/fare-quote */
bookingRouter.get('/fare-quote', (req, res) => {
  const flightLegId = String(req.query.flightLegId ?? '');
  const fareClass = String(req.query.fareClass ?? 'ECONOMY') as FareClass;
  const passengers = Math.max(1, Number(req.query.passengers ?? 1));
  const quote = bookingService.fareQuote(flightLegId, fareClass, passengers);
  if (!quote) {
    res.status(404).json({ error: 'NotFound', message: 'Fare not available' });
    return;
  }
  res.json({ data: quote });
});

/** GET /api/v1/booking/seat-map/:flightLegId */
bookingRouter.get('/seat-map/:flightLegId', (req, res) => {
  const seatMap = inventoryService.getSeatMap(req.params.flightLegId);
  if (!seatMap) {
    res.status(404).json({ error: 'NotFound', message: 'Flight inventory not found' });
    return;
  }
  res.json({ data: seatMap });
});

/** POST /api/v1/booking/hold */
bookingRouter.post('/hold', (req, res) => {
  const hold = bookingService.createHold({
    flightLegId: String(req.body?.flightLegId ?? ''),
    fareClass: (req.body?.fareClass ?? 'ECONOMY') as FareClass,
    passengers: req.body?.passengers ?? [],
    seatIds: req.body?.seatIds ?? [],
    quoteId: req.body?.quoteId,
  });
  if (!hold) {
    res.status(409).json({ error: 'Conflict', message: 'Unable to hold seats' });
    return;
  }
  res.status(201).json({ data: hold });
});

/** POST /api/v1/booking/create */
bookingRouter.post('/create', async (req, res, next) => {
  try {
    const holdId = String(req.body?.holdId ?? '');
    const booking = await bookingService.createBookingFromHold(holdId);
    if (!booking) {
      res.status(404).json({ error: 'NotFound', message: 'Hold expired or not found' });
      return;
    }
    res.status(201).json({ data: booking });
  } catch (err) {
    next(err);
  }
});

/** POST /api/v1/booking/payment/confirm */
bookingRouter.post('/payment/confirm', async (req, res, next) => {
  try {
    const bookingId = String(req.body?.bookingId ?? '');
    const idempotencyKey = String(req.body?.idempotencyKey ?? '');
    if (!bookingId || !idempotencyKey) {
      res.status(400).json({ error: 'ValidationError', message: 'bookingId and idempotencyKey required' });
      return;
    }
    const result = await bookingService.confirmPayment(
      bookingId,
      idempotencyKey,
      cardLast4FromBody(req.body ?? {})
    );
    if (!result) {
      res.status(404).json({ error: 'NotFound', message: 'Booking not found' });
      return;
    }
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

/** POST /api/v1/booking/payment/retry */
bookingRouter.post('/payment/retry', async (req, res, next) => {
  try {
    const bookingId = String(req.body?.bookingId ?? '');
    const paymentId = String(req.body?.paymentId ?? '');
    const idempotencyKey = String(req.body?.idempotencyKey ?? '');
    if (!bookingId || !paymentId || !idempotencyKey) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'bookingId, paymentId, and idempotencyKey required',
      });
      return;
    }
    const result = await bookingService.retryPayment(
      bookingId,
      paymentId,
      idempotencyKey,
      cardLast4FromBody(req.body ?? {})
    );
    if (!result) {
      res.status(404).json({ error: 'NotFound', message: 'Booking not found' });
      return;
    }
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

/** POST /api/v1/booking/ticket/issue */
bookingRouter.post('/ticket/issue', async (req, res, next) => {
  try {
    const bookingId = String(req.body?.bookingId ?? '');
    const issued = await bookingService.issueTickets(bookingId);
    if (!issued) {
      res.status(400).json({ error: 'ValidationError', message: 'Booking not confirmed for ticketing' });
      return;
    }
    res.json({ data: issued });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/booking/pnr/:pnr */
bookingRouter.get('/pnr/:pnr', (req, res) => {
  const booking = bookingService.getByPnr(req.params.pnr);
  if (!booking) {
    res.status(404).json({ error: 'NotFound', message: 'PNR not found' });
    return;
  }
  res.json({ data: booking });
});

/** PATCH /api/v1/booking/pnr/:pnr/itinerary */
bookingRouter.patch('/pnr/:pnr/itinerary', async (req, res, next) => {
  try {
    const booking = bookingService.getByPnr(req.params.pnr);
    if (!booking) {
      res.status(404).json({ error: 'NotFound', message: 'PNR not found' });
      return;
    }
    const updated = await bookingService.changeItinerary(
      booking.bookingId,
      String(req.body?.newFlightLegId ?? '')
    );
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

/** POST /api/v1/booking/pnr/:pnr/cancel */
bookingRouter.post('/pnr/:pnr/cancel', async (req, res, next) => {
  try {
    const booking = bookingService.getByPnr(req.params.pnr);
    if (!booking) {
      res.status(404).json({ error: 'NotFound', message: 'PNR not found' });
      return;
    }
    res.json({ data: await bookingService.cancel(booking.bookingId) });
  } catch (err) {
    next(err);
  }
});

/** POST /api/v1/booking/pnr/:pnr/refund */
bookingRouter.post('/pnr/:pnr/refund', async (req, res, next) => {
  try {
    const booking = bookingService.getByPnr(req.params.pnr);
    if (!booking) {
      res.status(404).json({ error: 'NotFound', message: 'PNR not found' });
      return;
    }
    res.json({ data: await bookingService.refund(booking.bookingId) });
  } catch (err) {
    next(err);
  }
});

/** POST /api/v1/booking/ancillaries */
bookingRouter.post('/ancillaries', async (req, res, next) => {
  try {
    const bookingId = String(req.body?.bookingId ?? '');
    const updated = await bookingService.addAncillaries(bookingId, req.body?.ancillaries ?? []);
    if (!updated) {
      res.status(404).json({ error: 'NotFound', message: 'Booking not found' });
      return;
    }
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/booking/disruption/:pnr/rebook-options */
bookingRouter.get('/disruption/:pnr/rebook-options', (req, res) => {
  res.json({ data: bookingService.getRebookingOptions(req.params.pnr) });
});

/** POST /api/v1/booking/disruption/:pnr/rebook */
bookingRouter.post('/disruption/:pnr/rebook', async (req, res) => {
  const booking = bookingService.getByPnr(req.params.pnr);
  if (!booking) {
    res.status(404).json({ error: 'NotFound', message: 'PNR not found' });
    return;
  }
  const options = bookingService.getRebookingOptions(req.params.pnr);
  const updated = await bookingService.reaccommodate(
    booking.bookingId,
    String(req.body?.optionId ?? ''),
    options
  );
  await logAudit({
    userId: req.user?.userId,
    action: 'booking.reaccommodated',
    resource: '/api/v1/booking/disruption/:pnr/rebook',
    metadata: { pnr: req.params.pnr, optionId: req.body?.optionId },
  });
  res.json({ data: updated, options });
});

/** GET /api/v1/booking/events */
bookingRouter.get('/events', (req, res) => {
  const bookingId = req.query.bookingId ? String(req.query.bookingId) : undefined;
  res.json({ data: bookingEvents.list(bookingId) });
});
