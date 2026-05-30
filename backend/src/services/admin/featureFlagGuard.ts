import { adminPersistence } from './adminPersistence';

const DEFAULT_FLAGS: Record<string, boolean> = {
  module_booking: true,
  module_commercial: true,
  module_copilot: true,
  module_mlops: true,
  module_sre: true,
  module_operations: true,
};

const FLAG_DESCRIPTIONS: Record<string, string> = {
  module_booking: 'Booking and My Trips',
  module_commercial: 'Commercial optimization',
  module_copilot: 'AI Copilot',
  module_mlops: 'MLOps',
  module_sre: 'SRE',
  module_operations: 'Operations modules',
};

const cache = new Map<string, boolean>(Object.entries(DEFAULT_FLAGS));
let cacheAt = Date.now();
let refreshInFlight: Promise<void> | null = null;

async function refreshCache(force = false): Promise<void> {
  if (!force && Date.now() - cacheAt < 30_000) return;
  if (refreshInFlight) {
    await refreshInFlight;
    return;
  }

  refreshInFlight = (async () => {
    try {
      const flags = await Promise.race([
        adminPersistence.listFeatureFlags(),
        new Promise<Awaited<ReturnType<typeof adminPersistence.listFeatureFlags>>>((resolve) =>
          setTimeout(() => resolve([]), 800)
        ),
      ]);
      if (flags.length > 0) {
        cache.clear();
        for (const flag of flags) cache.set(flag.flagKey, flag.enabled);
      }
      cacheAt = Date.now();
    } catch (err) {
      console.warn(
        '[feature-flag] refresh failed, keeping defaults:',
        err instanceof Error ? err.message : err
      );
    } finally {
      refreshInFlight = null;
    }
  })();

  await refreshInFlight;
}

/** Synchronous read — never blocks HTTP handlers on DB. */
export function isModuleEnabled(moduleFlagKey: string): boolean {
  return cache.get(moduleFlagKey) ?? true;
}

export function getFeatureFlagsMap(): Record<string, boolean> {
  return Object.fromEntries(cache.entries());
}

/** Immediate list for admin UI — never waits on Postgres. */
export function getFeatureFlagsForAdmin(): Array<{
  flagKey: string;
  enabled: boolean;
  description: string;
}> {
  return Object.keys(DEFAULT_FLAGS).map((flagKey) => ({
    flagKey,
    enabled: cache.get(flagKey) ?? DEFAULT_FLAGS[flagKey] ?? true,
    description: FLAG_DESCRIPTIONS[flagKey] ?? flagKey,
  }));
}

export function setCachedFeatureFlag(flagKey: string, enabled: boolean): void {
  if (flagKey in DEFAULT_FLAGS) {
    cache.set(flagKey, enabled);
    cacheAt = Date.now();
  }
}

export async function warmFeatureFlagCache(): Promise<void> {
  await refreshCache(true);
}

export function invalidateFeatureFlagCache(): void {
  cacheAt = 0;
  void refreshCache(true);
}

void refreshCache(true);
