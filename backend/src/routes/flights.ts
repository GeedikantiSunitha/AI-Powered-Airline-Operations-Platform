import { Router } from 'express';
import { flightService } from '../services/flights/flightService';
import { requireAuth } from '../middleware/auth';
import { broadcast } from '../websocket/manager';

export const flightsRouter = Router();
flightsRouter.use(requireAuth);

/** GET /api/v1/flights — list with optional filters */
flightsRouter.get('/', async (req, res, next) => {
  try {
    const { status, hub, date } = req.query;
    const flights = await flightService.list({
      status: status as string | undefined,
      hub: hub as string | undefined,
      date: date as string | undefined,
    });
    res.json({ data: flights });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/flights/:flightLegId */
flightsRouter.get('/:flightLegId', async (req, res, next) => {
  try {
    const flight = await flightService.getById(req.params.flightLegId);
    if (!flight) {
      res.status(404).json({ error: 'Flight not found' });
      return;
    }
    res.json({ data: flight });
  } catch (err) {
    next(err);
  }
});

/** POST /api/v1/flights/simulate-delay — Phase 2 */
flightsRouter.post('/simulate-delay', async (req, res, next) => {
  try {
    const { flightLegId, delayMinutes } = req.body ?? {};
    if (!flightLegId || typeof delayMinutes !== 'number') {
      res.status(400).json({
        error: 'ValidationError',
        message: 'flightLegId and numeric delayMinutes are required',
      });
      return;
    }

    const updated = await flightService.simulateDelay(flightLegId, delayMinutes);
    if (!updated) {
      res.status(404).json({ error: 'Flight not found' });
      return;
    }

    broadcast({
      type: 'flight.status.updated',
      payload: {
        flightLegId: updated.flightLegId,
        status: updated.status,
        delayMinutes: updated.delayMinutes ?? 0,
        gate: updated.gate ?? null,
        estimatedDeparture: updated.estimatedDeparture ?? null,
        updatedAt: new Date().toISOString(),
      },
    });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});
