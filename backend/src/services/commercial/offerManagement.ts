import { randomUUID } from 'crypto';
import type { AncillaryOffer, ExperimentAssignment } from '@airline-ops/shared';

const CATALOG: Array<Omit<AncillaryOffer, 'offerId' | 'experimentVariant' | 'discountedPriceUsd' | 'conversionLiftPct'>> = [
  { code: 'BAG', label: 'Extra checked bag', basePriceUsd: 35 },
  { code: 'SEAT', label: 'Preferred seat', basePriceUsd: 28 },
  { code: 'MEAL', label: 'Premium meal', basePriceUsd: 18 },
  { code: 'LOUNGE', label: 'Airport lounge access', basePriceUsd: 55 },
];

const experiments = new Map<string, ExperimentAssignment>();

function variantDiscount(variant: ExperimentAssignment['variant']): number {
  if (variant === 'treatment_a') return 0.85;
  if (variant === 'treatment_b') return 0.75;
  return 1.0;
}

function conversionLift(variant: ExperimentAssignment['variant']): number {
  if (variant === 'treatment_a') return 8;
  if (variant === 'treatment_b') return 14;
  return 0;
}

export const offerManagement = {
  assignExperiment(customerId: string, experimentId = 'ancillary-upsell-v1'): ExperimentAssignment {
    const hash = customerId.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const bucket = hash % 3;
    const variant: ExperimentAssignment['variant'] =
      bucket === 0 ? 'control' : bucket === 1 ? 'treatment_a' : 'treatment_b';
    const assignment: ExperimentAssignment = {
      experimentId,
      variant,
      assignedAt: new Date().toISOString(),
    };
    experiments.set(customerId, assignment);
    return assignment;
  },

  getExperiment(customerId: string): ExperimentAssignment | null {
    return experiments.get(customerId) ?? null;
  },

  listOffers(customerId: string): AncillaryOffer[] {
    const experiment =
      experiments.get(customerId) ?? this.assignExperiment(customerId);
    const discount = variantDiscount(experiment.variant);
    const lift = conversionLift(experiment.variant);

    return CATALOG.map((item) => ({
      offerId: randomUUID(),
      ...item,
      experimentVariant: experiment.variant,
      discountedPriceUsd: Number((item.basePriceUsd * discount).toFixed(2)),
      conversionLiftPct: lift,
    }));
  },

  retentionBundle(customerId: string, loyaltyTier: string): AncillaryOffer[] {
    const offers = this.listOffers(customerId);
    const extraDiscount = loyaltyTier === 'PLATINUM' ? 0.5 : loyaltyTier === 'GOLD' ? 0.65 : 0.8;
    return offers
      .filter((o) => o.code === 'LOUNGE' || o.code === 'MEAL' || o.code === 'SEAT')
      .map((o) => ({
        ...o,
        offerId: randomUUID(),
        discountedPriceUsd: Number((o.discountedPriceUsd * extraDiscount).toFixed(2)),
        conversionLiftPct: o.conversionLiftPct + 5,
      }));
  },
};
