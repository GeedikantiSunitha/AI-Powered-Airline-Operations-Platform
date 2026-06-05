import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { authHeader, loginAs } from '../helpers';

describe('RBAC', () => {
  const app = createApp();

  it('viewer cannot access admin completion-gates', async () => {
    const token = await loginAs(app, 'viewer', 'viewer123');
    await request(app)
      .get('/api/v1/admin/completion-gates')
      .set(authHeader(token))
      .expect(403);
  });

  it('admin can access completion-gates', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    const challenge = loginRes.body.mfaChallengeToken as string;
    const mfaRes = await request(app)
      .post('/api/v1/auth/mfa/verify')
      .send({ mfaChallengeToken: challenge, code: '123456' })
      .expect(200);
    const token = mfaRes.body.token as string;

    const res = await request(app)
      .get('/api/v1/admin/completion-gates')
      .set(authHeader(token))
      .expect(200);

    expect(res.body.data?.total).toBe(6);
    expect(typeof res.body.data?.ok).toBe('boolean');
  });
});
