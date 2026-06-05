import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { sloTracker } from './middleware/sloTracker';

/** Express app factory — used by server and integration tests (no listen). */
export function createApp(): express.Application {
  const app = express();
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  app.use(helmet());
  app.use(cors({ origin: frontendUrl }));
  app.use(express.json());
  app.use(sloTracker);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'airline-ops-api', timestamp: new Date().toISOString() });
  });

  app.use('/api/v1', apiRouter);
  app.use(errorHandler);

  return app;
}
