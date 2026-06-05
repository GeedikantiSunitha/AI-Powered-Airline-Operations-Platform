import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { WebSocketServer } from 'ws';
import { createApp } from './app';
import { createWsManager } from './websocket/manager';
import { bookingPersistence } from './services/booking/bookingPersistence';
import { bookingService } from './services/booking/bookingService';
import { adminPersistence } from './services/admin/adminPersistence';
import { commercialConfigService } from './services/commercial/commercialConfigService';
import { warmFeatureFlagCache } from './services/admin/featureFlagGuard';

dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

const PORT = Number(process.env.API_PORT) || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const app = createApp();

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
createWsManager(wss);

async function start(): Promise<void> {
  server.listen(PORT, () => {
    console.log(`[api] listening on http://localhost:${PORT}`);
    console.log(`[ws]  ws://localhost:${PORT}/ws`);
  });

  void (async () => {
    await Promise.allSettled([bookingPersistence.init(), adminPersistence.init()]);
    await Promise.allSettled([
      warmFeatureFlagCache(),
      commercialConfigService.refresh(true),
    ]);
    setInterval(() => {
      void commercialConfigService.refresh(true);
    }, 60_000);
    const loaded = await bookingService.hydrateFromDatabase();
    if (loaded > 0) {
      console.log(`[booking-persistence] restored ${loaded} booking(s)`);
    }
  })();
}

void start();
