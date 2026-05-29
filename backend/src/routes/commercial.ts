import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { logAudit } from '../middleware/audit';
import type { UserRole } from '@airline-ops/shared';
import { pricingEngine } from '../services/commercial/pricingEngine';
import { offerManagement } from '../services/commercial/offerManagement';
import { customerIntelligence } from '../services/commercial/customerIntelligence';
import { iropsModule } from '../services/commercial/iropsModule';
import { revenueDashboard } from '../services/commercial/revenueDashboard';
import { commercialOrchestrator } from '../services/commercial/commercialOrchestrator';
import { commercialEvents } from '../services/commercial/commercialEvents';
import { bookingService } from '../services/booking/bookingService';

export const commercialRouter = Router();
const roles: UserRole[] = ['admin', 'operations_manager', 'analyst', 'viewer', 'crew_manager'];
commercialRouter.use(requireAuth, requireRole(...roles));

/** GET /api/v1/commercial/pricing/:flightLegId */
commercialRouter.get('/pricing/:flightLegId', (req, res) => {
  const data = pricingEngine.listForFlight(req.params.flightLegId);
  if (data.length === 0) {
    res.status(404).json({ error: 'NotFound', message: 'Flight not found' });
    return;
  }
  res.json({ data });
});

/** GET /api/v1/commercial/offers */
commercialRouter.get('/offers', (req, res) => {
  const customerId = String(req.query.customerId ?? req.user?.username ?? 'guest');
  const data = offerManagement.listOffers(customerId);
  const experiment = offerManagement.getExperiment(customerId);
  res.json({ data, experiment });
});

/** GET /api/v1/commercial/customers/profile */
commercialRouter.get('/customers/profile', (req, res) => {
  const email = String(req.query.email ?? `${req.user?.username ?? 'guest'}@example.com`);
  res.json({ data: customerIntelligence.profile(email) });
});

/** GET /api/v1/commercial/irops/recommendations/:pnr */
commercialRouter.get('/irops/recommendations/:pnr', (req, res) => {
  const booking = bookingService.getByPnr(req.params.pnr);
  if (!booking) {
    res.status(404).json({ error: 'NotFound', message: 'PNR not found' });
    return;
  }
  res.json({ data: iropsModule.recommend(booking) });
});

/** POST /api/v1/commercial/demo-booking */
commercialRouter.post('/demo-booking', async (req, res, next) => {
  try {
    const booking = await bookingService.createDemoTicketedBooking({
      flightLegId: req.body?.flightLegId,
      email: req.body?.email,
    });
    if (!booking) {
      res.status(409).json({ error: 'Conflict', message: 'Unable to create demo booking' });
      return;
    }
    res.status(201).json({ data: booking });
  } catch (err) {
    next(err);
  }
});

/** POST /api/v1/commercial/irops/optimize */
commercialRouter.post('/irops/optimize', async (req, res, next) => {
  try {
    const flightLegId = String(req.body?.flightLegId ?? '');
    const pnr = String(req.body?.pnr ?? '');
    const result = await commercialOrchestrator.optimizeDisruption({ flightLegId, pnr });
    if (!result) {
      res.status(409).json({ error: 'Conflict', message: 'Unable to optimize disruption' });
      return;
    }
    await logAudit({
      userId: req.user?.userId,
      action: 'commercial.irops.optimize',
      resource: pnr,
      metadata: { flightLegId, netRevenueImpactUsd: result.impact.netRevenueImpactUsd },
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/commercial/dashboard/revenue */
commercialRouter.get('/dashboard/revenue', (_req, res) => {
  res.json({ data: revenueDashboard.getDashboard() });
});

/** GET /api/v1/commercial/events */
commercialRouter.get('/events', (_req, res) => {
  res.json({ data: commercialEvents.list() });
});
