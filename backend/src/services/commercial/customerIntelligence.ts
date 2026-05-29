import { randomUUID } from 'crypto';
import type { CustomerProfile, CustomerSegmentId } from '@airline-ops/shared';

function inferSegment(email: string): CustomerSegmentId {
  const domain = email.split('@')[1] ?? '';
  if (domain.includes('corp') || domain.includes('enterprise')) return 'BUSINESS';
  if (email.includes('gold') || email.includes('platinum')) return 'LOYALTY_PLATINUM';
  if (email.includes('loyal')) return 'LOYALTY_GOLD';
  return 'LEISURE';
}

function loyaltyFromSegment(segment: CustomerSegmentId): CustomerProfile['loyaltyTier'] {
  if (segment === 'LOYALTY_PLATINUM') return 'PLATINUM';
  if (segment === 'LOYALTY_GOLD') return 'GOLD';
  if (segment === 'BUSINESS') return 'SILVER';
  return 'NONE';
}

export const customerIntelligence = {
  profile(email: string): CustomerProfile {
    const segment = inferSegment(email);
    const loyaltyTier = loyaltyFromSegment(segment);
    const lifetimeValueUsd =
      segment === 'LOYALTY_PLATINUM' ? 12000 : segment === 'LOYALTY_GOLD' ? 6500 : segment === 'BUSINESS' ? 4200 : 900;

    const recommendations: CustomerProfile['recommendations'] = [];
    if (segment === 'BUSINESS' || loyaltyTier === 'PLATINUM') {
      recommendations.push({
        type: 'ancillary',
        message: 'Offer lounge + priority boarding bundle',
        priority: 1,
      });
    }
    if (segment === 'LEISURE') {
      recommendations.push({
        type: 'pricing',
        message: 'Highlight lowest fare with bag add-on upsell',
        priority: 2,
      });
    }
    if (loyaltyTier === 'GOLD' || loyaltyTier === 'PLATINUM') {
      recommendations.push({
        type: 'irops',
        message: 'Proactive rebooking with compensation waiver',
        priority: 1,
      });
    }

    return {
      customerId: randomUUID(),
      segment,
      loyaltyTier,
      lifetimeValueUsd,
      recommendations,
    };
  },
};
