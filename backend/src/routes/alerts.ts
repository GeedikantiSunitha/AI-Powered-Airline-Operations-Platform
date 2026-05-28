import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { alertEngine } from '../services/alerts/alertEngine';

export const alertsRouter = Router();
alertsRouter.use(requireAuth, requireRole('admin', 'operations_manager', 'viewer', 'analyst'));

/** GET /api/v1/alerts — Phase 7 */
alertsRouter.get('/', async (_req, res) => {
  res.json({ data: alertEngine.list() });
});

/** POST /api/v1/alerts/acknowledge/:alertId — Phase 7 */
alertsRouter.post('/acknowledge/:alertId', async (req, res) => {
  const updated = await alertEngine.acknowledge(req.params.alertId);
  if (!updated) {
    res.status(404).json({ error: 'NotFound', message: 'Alert not found' });
    return;
  }
  res.json({ data: updated });
});

/** POST /api/v1/alerts/test-event — Phase 7 */
alertsRouter.post('/test-event', async (req, res, next) => {
  try {
    const { type, flightLegId, airportIata, probability, weatherRiskScore, delayedBags, message } =
      req.body ?? {};
    const alert = await alertEngine.evaluateEvent({
      type,
      flightLegId,
      airportIata,
      probability,
      weatherRiskScore,
      delayedBags,
      message,
    });
    if (!alert) {
      res.status(400).json({
        error: 'ValidationError',
        message:
          'Unsupported type. Use DelayRiskElevated|CrewUnavailable|WeatherRiskDetected|BaggageDelayDetected',
      });
      return;
    }
    res.status(201).json({ data: alert });
  } catch (err) {
    next(err);
  }
});
