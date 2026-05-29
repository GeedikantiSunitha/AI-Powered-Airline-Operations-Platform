import { Router } from 'express';
import { flightsRouter } from './flights';
import { kpiRouter } from './kpi';
import { alertsRouter } from './alerts';
import { predictionsRouter } from './predictions';
import { copilotRouter } from './copilot';
import { authRouter } from './auth';
import { adminRouter } from './admin';
import { mlopsRouter } from './mlops';
import { securityRouter } from './security';
import { sreRouter } from './sre';
import { bookingRouter } from './booking';
import { commercialRouter } from './commercial';
import { operationsRouter } from './operations';

export const apiRouter = Router();

// Phase 1+
apiRouter.use('/auth', authRouter);

// Phase 2+
apiRouter.use('/flights', flightsRouter);

// Phase 5+
apiRouter.use('/kpi', kpiRouter);

// Phase 6+
apiRouter.use('/predictions', predictionsRouter);

// Phase 7+
apiRouter.use('/alerts', alertsRouter);

// Phase 8+
apiRouter.use('/copilot', copilotRouter);

// Phase 10+
apiRouter.use('/admin', adminRouter);

// Phase 13+
apiRouter.use('/mlops', mlopsRouter);

// Phase 15+
apiRouter.use('/security', securityRouter);

// Phase 16+
apiRouter.use('/sre', sreRouter);

// Phase 17+
apiRouter.use('/booking', bookingRouter);

// Phase 18+
apiRouter.use('/commercial', commercialRouter);
apiRouter.use('/operations', operationsRouter);
