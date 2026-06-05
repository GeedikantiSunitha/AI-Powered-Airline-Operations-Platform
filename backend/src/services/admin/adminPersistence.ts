import { randomUUID } from 'crypto';
import pg from 'pg';
import type { UserRole } from '@airline-ops/shared';
import { hashPassword } from './passwordUtils';

export interface StoredAdminUser {
  userId: string;
  username: string;
  passwordHash: string | null;
  role: UserRole;
  status: 'active' | 'disabled';
  mfaEnabled: boolean;
  authProvider: 'local' | 'cognito';
}

export interface StoredAlertRule {
  ruleId: string;
  type: 'DelayRiskElevated' | 'CrewUnavailable' | 'WeatherRiskDetected' | 'BaggageDelayDetected';
  enabled: boolean;
  threshold: number;
}

export interface FeatureFlag {
  flagKey: string;
  enabled: boolean;
  description: string;
}

let pool: pg.Pool | null = null;
let enabled = false;

const memoryUsers: StoredAdminUser[] = [];
const memoryRules: StoredAlertRule[] = [
  { ruleId: 'rule-delay-risk', type: 'DelayRiskElevated', enabled: true, threshold: 0.7 },
  { ruleId: 'rule-crew-unavail', type: 'CrewUnavailable', enabled: true, threshold: 1 },
  { ruleId: 'rule-weather-risk', type: 'WeatherRiskDetected', enabled: true, threshold: 0.75 },
  { ruleId: 'rule-baggage-delay', type: 'BaggageDelayDetected', enabled: true, threshold: 40 },
];
const memoryFlags = new Map<string, FeatureFlag>();
const memoryConfig = new Map<string, Record<string, unknown>>();

const SEED_USERS: Array<{ username: string; password: string; role: UserRole; mfaEnabled: boolean }> = [
  { username: 'admin', password: 'admin123', role: 'admin', mfaEnabled: true },
  { username: 'opsmanager', password: 'ops123', role: 'operations_manager', mfaEnabled: false },
  { username: 'crewmanager', password: 'crew123', role: 'crew_manager', mfaEnabled: false },
  { username: 'analyst', password: 'analyst123', role: 'analyst', mfaEnabled: false },
  { username: 'viewer', password: 'viewer123', role: 'viewer', mfaEnabled: false },
];

async function seedDefaults(): Promise<void> {
  for (const seed of SEED_USERS) {
    const hash = await hashPassword(seed.password);
    const user: StoredAdminUser = {
      userId: `u-${seed.username}`,
      username: seed.username,
      passwordHash: hash,
      role: seed.role,
      status: 'active',
      mfaEnabled: seed.mfaEnabled,
      authProvider: 'local',
    };
    if (enabled && pool) {
      await pool.query(
        `INSERT INTO admin_users (user_id, username, password_hash, role, status, mfa_enabled, auth_provider)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (username) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           status = EXCLUDED.status,
           mfa_enabled = EXCLUDED.mfa_enabled,
           auth_provider = EXCLUDED.auth_provider`,
        [user.userId, user.username, user.passwordHash, user.role, user.status, user.mfaEnabled, user.authProvider]
      );
    } else {
      const existingIdx = memoryUsers.findIndex((u) => u.username === user.username);
      if (existingIdx >= 0) {
        memoryUsers[existingIdx] = {
          ...memoryUsers[existingIdx],
          passwordHash: user.passwordHash,
          role: user.role,
          status: user.status,
          mfaEnabled: user.mfaEnabled,
          authProvider: user.authProvider,
        };
      } else {
        memoryUsers.push(user);
      }
    }
  }

  if (enabled && pool) {
    for (const rule of memoryRules) {
      await pool.query(
        `INSERT INTO alert_rules (rule_id, rule_type, enabled, threshold)
         VALUES ($1,$2,$3,$4) ON CONFLICT (rule_id) DO NOTHING`,
        [rule.ruleId, rule.type, rule.enabled, rule.threshold]
      );
    }
  }
}

async function degradeToMemory(err: unknown): Promise<void> {
  if (!enabled) return;
  console.warn(
    '[admin-persistence] database unavailable, using memory:',
    err instanceof Error ? err.message : err
  );
  pool = null;
  enabled = false;
  await seedDefaults();
}

async function queryWithTimeout<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params: unknown[] = [],
  timeoutMs = 2000
): Promise<pg.QueryResult<T>> {
  if (!pool) throw new Error('Database pool unavailable');
  return (await Promise.race([
    pool.query<T>(sql, params),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`DB query timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ])) as pg.QueryResult<T>;
}

export const adminPersistence = {
  isEnabled(): boolean {
    return enabled;
  },

  async init(): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      await seedDefaults();
      return;
    }
    const url = process.env.DATABASE_URL;
    if (!url) {
      await seedDefaults();
      return;
    }
    try {
      pool = new pg.Pool({
        connectionString: url,
        max: 5,
        connectionTimeoutMillis: 2000,
        query_timeout: 3000,
        statement_timeout: 3000,
      });
      await queryWithTimeout('SELECT 1');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_users (
          user_id VARCHAR(64) PRIMARY KEY,
          username VARCHAR(64) UNIQUE NOT NULL,
          password_hash VARCHAR(255),
          role VARCHAR(32) NOT NULL,
          status VARCHAR(16) NOT NULL DEFAULT 'active',
          mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
          auth_provider VARCHAR(16) NOT NULL DEFAULT 'local',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS alert_rules (
          rule_id VARCHAR(64) PRIMARY KEY,
          rule_type VARCHAR(50) NOT NULL,
          enabled BOOLEAN NOT NULL DEFAULT TRUE,
          threshold NUMERIC(10, 4) NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS feature_flags (
          flag_key VARCHAR(64) PRIMARY KEY,
          enabled BOOLEAN NOT NULL DEFAULT TRUE,
          description TEXT,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS commercial_config (
          config_key VARCHAR(64) PRIMARY KEY,
          config_value JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id BIGSERIAL PRIMARY KEY,
          user_id VARCHAR(64),
          action VARCHAR(128) NOT NULL,
          resource VARCHAR(255),
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      enabled = true;
      await seedDefaults();
      console.log('[admin-persistence] Postgres enabled');
    } catch (err) {
      console.warn('[admin-persistence] fallback to memory:', err instanceof Error ? err.message : err);
      pool = null;
      enabled = false;
      await seedDefaults();
    }
  },

  async listUsers(): Promise<StoredAdminUser[]> {
    if (!pool || !enabled) return [...memoryUsers];
    try {
      const result = await queryWithTimeout('SELECT * FROM admin_users ORDER BY username');
      return result.rows.map((row) => ({
        userId: row.user_id as string,
        username: row.username as string,
        passwordHash: (row.password_hash as string) ?? null,
        role: row.role as UserRole,
        status: row.status as 'active' | 'disabled',
        mfaEnabled: Boolean(row.mfa_enabled),
        authProvider: row.auth_provider as 'local' | 'cognito',
      }));
    } catch (err) {
      await degradeToMemory(err);
      return [...memoryUsers];
    }
  },

  async findByUsername(username: string): Promise<StoredAdminUser | null> {
    const normalized = username.trim().toLowerCase();
    if (!pool || !enabled) {
      return memoryUsers.find((u) => u.username.toLowerCase() === normalized) ?? null;
    }
    try {
      const result = await queryWithTimeout(
        'SELECT * FROM admin_users WHERE LOWER(username) = $1',
        [normalized]
      );
      const row = result.rows[0];
      if (!row) return null;
      return {
        userId: row.user_id as string,
        username: row.username as string,
        passwordHash: (row.password_hash as string) ?? null,
        role: row.role as UserRole,
        status: row.status as 'active' | 'disabled',
        mfaEnabled: Boolean(row.mfa_enabled),
        authProvider: row.auth_provider as 'local' | 'cognito',
      };
    } catch (err) {
      await degradeToMemory(err);
      return memoryUsers.find((u) => u.username.toLowerCase() === normalized) ?? null;
    }
  },

  async createUser(input: {
    username: string;
    role: UserRole;
    password: string;
    mfaEnabled?: boolean;
  }): Promise<StoredAdminUser> {
    const user: StoredAdminUser = {
      userId: randomUUID(),
      username: input.username,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      status: 'active',
      mfaEnabled: input.mfaEnabled ?? input.role === 'admin',
      authProvider: 'local',
    };
    if (!pool || !enabled) {
      memoryUsers.push(user);
      return user;
    }
    await pool.query(
      `INSERT INTO admin_users (user_id, username, password_hash, role, status, mfa_enabled, auth_provider)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [user.userId, user.username, user.passwordHash, user.role, user.status, user.mfaEnabled, user.authProvider]
    );
    return user;
  },

  async updateUser(
    username: string,
    patch: Partial<Pick<StoredAdminUser, 'role' | 'status' | 'mfaEnabled' | 'passwordHash'>>
  ): Promise<StoredAdminUser | null> {
    const existing = await this.findByUsername(username);
    if (!existing) return null;
    const updated = { ...existing, ...patch };
    if (!pool || !enabled) {
      const idx = memoryUsers.findIndex((u) => u.username === username);
      if (idx >= 0) memoryUsers[idx] = updated;
      return updated;
    }
    await pool.query(
      `UPDATE admin_users SET role=$2, status=$3, mfa_enabled=$4, password_hash=COALESCE($5, password_hash), updated_at=NOW()
       WHERE username=$1`,
      [username, updated.role, updated.status, updated.mfaEnabled, patch.passwordHash ?? null]
    );
    return updated;
  },

  async listAlertRules(): Promise<StoredAlertRule[]> {
    if (!pool || !enabled) return [...memoryRules];
    try {
      const result = await queryWithTimeout('SELECT * FROM alert_rules ORDER BY rule_id');
      return result.rows.map((row) => ({
        ruleId: row.rule_id as string,
        type: row.rule_type as StoredAlertRule['type'],
        enabled: Boolean(row.enabled),
        threshold: Number(row.threshold),
      }));
    } catch (err) {
      await degradeToMemory(err);
      return [...memoryRules];
    }
  },

  async updateAlertRule(
    ruleId: string,
    patch: Partial<Pick<StoredAlertRule, 'enabled' | 'threshold'>>
  ): Promise<StoredAlertRule | null> {
    let idx = memoryRules.findIndex((r) => r.ruleId === ruleId);
    if (idx < 0 && pool && enabled) {
      try {
        await this.listAlertRules();
        idx = memoryRules.findIndex((r) => r.ruleId === ruleId);
      } catch {
        idx = memoryRules.findIndex((r) => r.ruleId === ruleId);
      }
    }
    if (idx < 0) return null;

    const rule = memoryRules[idx];
    if (typeof patch.enabled === 'boolean') rule.enabled = patch.enabled;
    if (typeof patch.threshold === 'number') rule.threshold = patch.threshold;

    if (!pool || !enabled) return { ...rule };

    try {
      await queryWithTimeout(
        `UPDATE alert_rules SET enabled=$2, threshold=$3, updated_at=NOW() WHERE rule_id=$1`,
        [ruleId, rule.enabled, rule.threshold]
      );
    } catch (err) {
      await degradeToMemory(err);
    }
    return { ...rule };
  },

  async listFeatureFlags(): Promise<FeatureFlag[]> {
    if (!pool || !enabled) {
      if (memoryFlags.size === 0) {
        [
          ['module_booking', 'Booking and My Trips'],
          ['module_commercial', 'Commercial optimization'],
          ['module_copilot', 'AI Copilot'],
          ['module_mlops', 'MLOps'],
          ['module_sre', 'SRE'],
          ['module_operations', 'Operations modules'],
        ].forEach(([key, desc]) => memoryFlags.set(key, { flagKey: key, enabled: true, description: desc }));
      }
      return [...memoryFlags.values()];
    }
    try {
      const result = await queryWithTimeout('SELECT * FROM feature_flags ORDER BY flag_key');
      if (result.rows.length === 0) {
        await seedDefaults();
        return this.listFeatureFlags();
      }
      return result.rows.map((row) => ({
        flagKey: row.flag_key as string,
        enabled: Boolean(row.enabled),
        description: (row.description as string) ?? '',
      }));
    } catch (err) {
      await degradeToMemory(err);
      if (memoryFlags.size === 0) {
        [
          ['module_booking', 'Booking and My Trips'],
          ['module_commercial', 'Commercial optimization'],
          ['module_copilot', 'AI Copilot'],
          ['module_mlops', 'MLOps'],
          ['module_sre', 'SRE'],
          ['module_operations', 'Operations modules'],
        ].forEach(([key, desc]) => memoryFlags.set(key, { flagKey: key, enabled: true, description: desc }));
      }
      return [...memoryFlags.values()];
    }
  },

  async setFeatureFlag(flagKey: string, enabledFlag: boolean): Promise<FeatureFlag | null> {
    const flags = await this.listFeatureFlags();
    const flag = flags.find((f) => f.flagKey === flagKey);
    if (!flag) return null;
    flag.enabled = enabledFlag;
    if (!pool || !enabled) {
      memoryFlags.set(flagKey, flag);
      return flag;
    }
    await pool.query(`UPDATE feature_flags SET enabled=$2, updated_at=NOW() WHERE flag_key=$1`, [
      flagKey,
      enabledFlag,
    ]);
    return flag;
  },

  async getCommercialConfig(): Promise<Record<string, unknown>> {
    const defaults = {
      fare_rules: { maxPriceMultiplier: 1.5, minPriceMultiplier: 0.85, dynamicPricingEnabled: true },
      experiments: { ancillaryUpsellEnabled: true, defaultExperimentId: 'ancillary-upsell-v1' },
    };
    if (!pool || !enabled) {
      if (memoryConfig.size === 0) {
        Object.entries(defaults).forEach(([k, v]) => memoryConfig.set(k, v));
      }
      return Object.fromEntries(memoryConfig);
    }
    try {
      const result = await queryWithTimeout('SELECT config_key, config_value FROM commercial_config');
      if (result.rows.length === 0) return defaults;
      const out: Record<string, unknown> = {};
      for (const row of result.rows) {
        out[row.config_key as string] = row.config_value;
      }
      return { ...defaults, ...out };
    } catch (err) {
      await degradeToMemory(err);
      if (memoryConfig.size === 0) {
        Object.entries(defaults).forEach(([k, v]) => memoryConfig.set(k, v));
      }
      return Object.fromEntries(memoryConfig);
    }
  },

  async updateCommercialConfig(key: string, value: Record<string, unknown>): Promise<void> {
    if (!pool || !enabled) {
      memoryConfig.set(key, value);
      return;
    }
    await pool.query(
      `INSERT INTO commercial_config (config_key, config_value, updated_at)
       VALUES ($1, $2, NOW()) ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = NOW()`,
      [key, JSON.stringify(value)]
    );
  },

  async persistAudit(entry: {
    traceId: string;
    category: string;
    userId?: string;
    action: string;
    resource?: string;
    metadata?: Record<string, unknown>;
    at: string;
  }): Promise<void> {
    if (!pool || !enabled) return;
    try {
      await queryWithTimeout(
        `INSERT INTO audit_logs (user_id, action, resource, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          entry.userId ?? null,
          entry.action,
          entry.resource ?? null,
          JSON.stringify({ ...entry.metadata, traceId: entry.traceId, category: entry.category }),
          entry.at,
        ]
      );
    } catch (error) {
      const code = (error as { code?: string } | undefined)?.code;
      if (code === '42P01') return;
      await degradeToMemory(error);
      return;
    }
  },

  async listAuditLogs(limit = 100): Promise<
    Array<{
      traceId: string;
      category: string;
      userId?: string;
      action: string;
      resource?: string;
      metadata?: Record<string, unknown>;
      at: string;
    }>
  > {
    if (!pool || !enabled) return [];
    let result;
    try {
      result = await queryWithTimeout(
        `SELECT user_id, action, resource, metadata, created_at FROM audit_logs ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
    } catch (error) {
      const code = (error as { code?: string } | undefined)?.code;
      if (code === '42P01') return [];
      await degradeToMemory(error);
      return [];
    }
    return result.rows.map((row) => {
      const meta = (row.metadata as Record<string, unknown>) ?? {};
      return {
        traceId: String(meta.traceId ?? ''),
        category: String(meta.category ?? 'system'),
        userId: (row.user_id as string) ?? undefined,
        action: row.action as string,
        resource: (row.resource as string) ?? undefined,
        metadata: meta,
        at: new Date(row.created_at as string).toISOString(),
      };
    });
  },
};
