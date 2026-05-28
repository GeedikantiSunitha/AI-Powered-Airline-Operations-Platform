import { Router } from 'express';
import { authService } from '../services/auth/authService';
import { logAudit } from '../middleware/audit';
import { requireAuth } from '../middleware/auth';

export const authRouter = Router();

/** POST /api/v1/auth/login — Phase 1 */
authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    res.status(400).json({ error: 'ValidationError', message: 'username and password required' });
    return;
  }

  const result = authService.login({ username, password });
  if (!result) {
    await logAudit({
      action: 'auth.login_failed',
      resource: '/api/v1/auth/login',
      metadata: { username },
    });
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
    return;
  }

  await logAudit({
    userId: result.user.userId,
    action: 'auth.login_success',
    resource: '/api/v1/auth/login',
    metadata: { username: result.user.username, role: result.user.role },
  });

  res.json({ token: result.token, user: result.user });
});

/** GET /api/v1/auth/me */
authRouter.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

/** POST /api/v1/auth/logout */
authRouter.post('/logout', requireAuth, async (req, res) => {
  await logAudit({
    userId: req.user?.userId,
    action: 'auth.logout',
    resource: '/api/v1/auth/logout',
    metadata: { username: req.user?.username, role: req.user?.role },
  });
  res.json({ success: true });
});
