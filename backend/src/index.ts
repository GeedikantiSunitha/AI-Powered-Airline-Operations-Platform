import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { WebSocketServer } from 'ws';
import { apiRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { sloTracker } from './middleware/sloTracker';
import { createWsManager } from './websocket/manager';

dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

const PORT = Number(process.env.API_PORT) || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const app = express();
app.use(helmet());
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());
app.use(sloTracker);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'airline-ops-api', timestamp: new Date().toISOString() });
});

app.use('/api/v1', apiRouter);
app.use(errorHandler);

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
createWsManager(wss);

server.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
  console.log(`[ws]  ws://localhost:${PORT}/ws`);
});
