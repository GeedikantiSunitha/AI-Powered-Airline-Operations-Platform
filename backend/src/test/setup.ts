import dotenv from 'dotenv';
import path from 'path';
import { beforeAll } from 'vitest';
import { adminPersistence } from '../services/admin/adminPersistence';
import { warmFeatureFlagCache } from '../services/admin/featureFlagGuard';

dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

/** Tests use in-memory admin/booking seed — avoids flaky local Postgres during vitest. */
delete process.env.DATABASE_URL;

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.AUTH_PROVIDER = 'local';
process.env.NODE_ENV = 'test';

beforeAll(async () => {
  await adminPersistence.init();
  await warmFeatureFlagCache();
}, 30_000);
