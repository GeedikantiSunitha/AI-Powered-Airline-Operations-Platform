import { adminPersistence } from '../admin/adminPersistence';

export interface FareRulesConfig {
  maxPriceMultiplier: number;
  minPriceMultiplier: number;
  dynamicPricingEnabled: boolean;
}

export interface ExperimentsConfig {
  ancillaryUpsellEnabled: boolean;
  defaultExperimentId: string;
}

const DEFAULT_FARE_RULES: FareRulesConfig = {
  maxPriceMultiplier: 1.5,
  minPriceMultiplier: 0.85,
  dynamicPricingEnabled: true,
};

const DEFAULT_EXPERIMENTS: ExperimentsConfig = {
  ancillaryUpsellEnabled: true,
  defaultExperimentId: 'ancillary-upsell-v1',
};

let fareRules: FareRulesConfig = { ...DEFAULT_FARE_RULES };
let experiments: ExperimentsConfig = { ...DEFAULT_EXPERIMENTS };
let loadedAt = 0;

function parseFareRules(raw: unknown): FareRulesConfig {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_FARE_RULES };
  const row = raw as Record<string, unknown>;
  return {
    maxPriceMultiplier: Number(row.maxPriceMultiplier ?? DEFAULT_FARE_RULES.maxPriceMultiplier),
    minPriceMultiplier: Number(row.minPriceMultiplier ?? DEFAULT_FARE_RULES.minPriceMultiplier),
    dynamicPricingEnabled: row.dynamicPricingEnabled !== false,
  };
}

function parseExperiments(raw: unknown): ExperimentsConfig {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_EXPERIMENTS };
  const row = raw as Record<string, unknown>;
  return {
    ancillaryUpsellEnabled: row.ancillaryUpsellEnabled !== false,
    defaultExperimentId: String(row.defaultExperimentId ?? DEFAULT_EXPERIMENTS.defaultExperimentId),
  };
}

export const commercialConfigService = {
  async refresh(force = false): Promise<void> {
    if (!force && Date.now() - loadedAt < 15_000) return;
    const config = await adminPersistence.getCommercialConfig();
    fareRules = parseFareRules(config.fare_rules);
    experiments = parseExperiments(config.experiments);
    loadedAt = Date.now();
  },

  invalidate(): void {
    loadedAt = 0;
  },

  getFareRules(): FareRulesConfig {
    return fareRules;
  },

  getExperiments(): ExperimentsConfig {
    return experiments;
  },
};
