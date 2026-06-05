import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';

describe('GET /health', () => {
  const app = createApp();

  it('returns ok without authentication', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('airline-ops-api');
  });
});
