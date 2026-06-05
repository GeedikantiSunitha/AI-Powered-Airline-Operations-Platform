import type { Application } from 'express';
import request from 'supertest';

export async function loginAs(
  app: Application,
  username: string,
  password: string
): Promise<string> {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ username, password })
    .expect(200);
  const token = res.body?.token as string | undefined;
  if (!token) throw new Error(`No token for ${username}`);
  return token;
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
