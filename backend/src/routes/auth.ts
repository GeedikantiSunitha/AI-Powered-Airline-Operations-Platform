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

  const result = await authService.login({ username, password });
  if (!result) {
    await logAudit({
      action: 'auth.login_failed',
      resource: '/api/v1/auth/login',
      metadata: { username },
    });
    const config = authService.getAuthConfig();
    const message =
      config.provider === 'cognito'
        ? 'Local login disabled. Sign in with Cognito and use the ID or access token as Bearer.'
        : 'Invalid credentials';
    res.status(401).json({ error: 'Unauthorized', message });
    return;
  }

  if (result.mfaRequired) {
    res.json({
      mfaRequired: true,
      mfaChallengeToken: result.mfaChallengeToken,
      message: 'Admin MFA required. Use code 123456 in development.',
    });
    return;
  }

  await logAudit({
    userId: result.user!.userId,
    action: 'auth.login_success',
    resource: '/api/v1/auth/login',
    metadata: { username: result.user!.username, role: result.user!.role },
  });

  res.json({ token: result.token, user: result.user });
});

/** POST /api/v1/auth/mfa/verify */
authRouter.post('/mfa/verify', async (req, res) => {
  const challengeToken = String(req.body?.mfaChallengeToken ?? '');
  const code = String(req.body?.code ?? '');
  const result = authService.verifyMfa(challengeToken, code);
  if (!result?.token || !result.user) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid MFA code' });
    return;
  }
  await logAudit({
    userId: result.user.userId,
    action: 'auth.mfa_verified',
    resource: '/api/v1/auth/mfa/verify',
    metadata: { username: result.user.username },
  });
  res.json({ token: result.token, user: result.user });
});

/** GET /api/v1/auth/config */
authRouter.get('/config', (_req, res) => {
  res.json({ data: authService.getAuthConfig() });
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
