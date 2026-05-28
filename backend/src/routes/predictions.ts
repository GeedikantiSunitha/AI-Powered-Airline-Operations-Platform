import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { sagemakerClient } from '../services/prediction/sagemakerClient';
import { flightService } from '../services/flights/flightService';
import { predictionOrchestrator } from '../services/prediction/predictionOrchestrator';
import { weatherModel } from '../services/prediction/models/weatherModel';
import { passengerModel } from '../services/prediction/models/passengerModel';
import { maintenanceModel } from '../services/prediction/models/maintenanceModel';
import { delayModel } from '../services/prediction/models/delayModel';

export const predictionsRouter = Router();
predictionsRouter.use(requireAuth, requireRole('admin', 'operations_manager', 'analyst', 'viewer'));

async function getFlightOr404(flightLegId: string, res: import('express').Response) {
  const flight = await flightService.getById(flightLegId);
  if (!flight) {
    res.status(404).json({ error: 'NotFound', message: 'Flight not found' });
    return null;
  }
  return flight;
}

/** GET /api/v1/predictions/delay?flightLegId= — Phase 6 */
predictionsRouter.get('/delay', async (req, res, next) => {
  try {
    const flightLegId = String(req.query.flightLegId ?? '');
    if (!flightLegId) {
      res
        .status(400)
        .json({ error: 'ValidationError', message: 'flightLegId query param is required' });
      return;
    }
    const prediction = await sagemakerClient.predictDelay(flightLegId);
    if (!prediction) {
      res.status(404).json({ error: 'NotFound', message: 'Flight not found' });
      return;
    }
    res.json({ data: prediction });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/predictions/delay/batch?hours=3 — Phase 6 */
predictionsRouter.get('/delay/batch', async (req, res, next) => {
  try {
    const flights = await flightService.list({});
    const predictions = (
      await Promise.all(flights.map((f) => sagemakerClient.predictDelay(f.flightLegId)))
    ).filter(
      (prediction): prediction is NonNullable<Awaited<ReturnType<typeof sagemakerClient.predictDelay>>> =>
        prediction !== null
    );
    const sorted = predictions.sort((a, b) => b.delayProbability - a.delayProbability);
    res.json({ data: sorted });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/predictions/scenario?flightLegId= — Phase 12 unified scenario */
predictionsRouter.get('/scenario', async (req, res, next) => {
  try {
    const flightLegId = String(req.query.flightLegId ?? '');
    if (!flightLegId) {
      res
        .status(400)
        .json({ error: 'ValidationError', message: 'flightLegId query param is required' });
      return;
    }
    const scenario = await predictionOrchestrator.getScenario(flightLegId);
    if (!scenario) {
      res.status(404).json({ error: 'NotFound', message: 'Flight not found' });
      return;
    }
    res.json({ data: scenario });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/predictions/weather?flightLegId= — Phase 12 */
predictionsRouter.get('/weather', async (req, res, next) => {
  try {
    const flightLegId = String(req.query.flightLegId ?? '');
    if (!flightLegId) {
      res.status(400).json({ error: 'ValidationError', message: 'flightLegId is required' });
      return;
    }
    const flight = await getFlightOr404(flightLegId, res);
    if (!flight) return;
    res.json({ data: weatherModel.predictUnified(flight) });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/predictions/passenger-impact?flightLegId= — Phase 12 */
predictionsRouter.get('/passenger-impact', async (req, res, next) => {
  try {
    const flightLegId = String(req.query.flightLegId ?? '');
    if (!flightLegId) {
      res.status(400).json({ error: 'ValidationError', message: 'flightLegId is required' });
      return;
    }
    const flight = await getFlightOr404(flightLegId, res);
    if (!flight) return;
    res.json({ data: passengerModel.predictUnified(flight) });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/predictions/maintenance?flightLegId= — Phase 12 */
predictionsRouter.get('/maintenance', async (req, res, next) => {
  try {
    const flightLegId = String(req.query.flightLegId ?? '');
    if (!flightLegId) {
      res.status(400).json({ error: 'ValidationError', message: 'flightLegId is required' });
      return;
    }
    const flight = await getFlightOr404(flightLegId, res);
    if (!flight) return;
    res.json({ data: maintenanceModel.predictUnified(flight) });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/predictions/unified/delay?flightLegId= — Phase 12 contract */
predictionsRouter.get('/unified/delay', async (req, res, next) => {
  try {
    const flightLegId = String(req.query.flightLegId ?? '');
    if (!flightLegId) {
      res.status(400).json({ error: 'ValidationError', message: 'flightLegId is required' });
      return;
    }
    const flight = await getFlightOr404(flightLegId, res);
    if (!flight) return;
    res.json({ data: delayModel.predictUnified(flight) });
  } catch (err) {
    next(err);
  }
});
