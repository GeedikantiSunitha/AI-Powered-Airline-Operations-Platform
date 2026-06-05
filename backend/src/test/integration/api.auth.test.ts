import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { loginAs } from '../helpers';

describe('POST /api/v1/auth/login', () => {
  const app = createApp();

  it('returns token for analyst credentials', async () => {
    const token = await loginAs(app, 'analyst', 'analyst123');
    expect(token).toBeTruthy();
  });

  it('returns 401 for invalid password', async () => {
    await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'analyst', password: 'wrong' })
      .expect(401);
  });

  it('requires MFA challenge for admin', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(200);
    expect(res.body.mfaRequired).toBe(true);
    expect(res.body.mfaChallengeToken).toBeTruthy();
  });
});
