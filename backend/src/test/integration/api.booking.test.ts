import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { authHeader, loginAs } from '../helpers';

describe('POST /api/v1/booking/search', () => {
  const app = createApp();

  it('returns 401 without Bearer token', async () => {
    await request(app)
      .post('/api/v1/booking/search')
      .send({ origin: 'DEL', destination: 'BOM', passengers: 1 })
      .expect(401);
  });

  it('returns flights with airline names for authenticated analyst', async () => {
    const token = await loginAs(app, 'analyst', 'analyst123');
    const res = await request(app)
      .post('/api/v1/booking/search')
      .set(authHeader(token))
      .send({
        origin: 'HYD',
        destination: 'BLR',
        passengers: 1,
        travelDate: '2026-06-10',
      })
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    expect(res.body.meta?.availableRoutes).toBeDefined();
    const first = res.body.data[0];
    expect(first.flightNumber).toBeTruthy();
    expect(first.airlineName).toBeTruthy();
    expect(first.scheduledDeparture).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('rejects same origin and destination', async () => {
    const token = await loginAs(app, 'analyst', 'analyst123');
    await request(app)
      .post('/api/v1/booking/search')
      .set(authHeader(token))
      .send({ origin: 'DEL', destination: 'DEL', passengers: 1 })
      .expect(400);
  });
});
