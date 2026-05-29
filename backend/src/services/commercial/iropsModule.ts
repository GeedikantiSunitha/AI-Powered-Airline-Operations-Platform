import type {
  BookingRecord,
  CommercialImpactMetrics,
  IropsRecommendation,
  RebookingOption,
} from '@airline-ops/shared';
import { mockFlights } from '../../data/mockFlights';
import { bookingService } from '../booking/bookingService';
import { customerIntelligence } from './customerIntelligence';
import { offerManagement } from './offerManagement';

function scoreOption(
  option: RebookingOption,
  booking: BookingRecord,
  loyaltyWeight: number,
  ancillaryValueUsd: number
): IropsRecommendation {
  const flight = mockFlights.find((f) => f.flightLegId === option.flightLegId);
  const delayPenalty = flight?.delayMinutes ? flight.delayMinutes * 0.5 : 0;
  const revenueImpactUsd = ancillaryValueUsd + loyaltyWeight * 20 - option.compensationUsd - delayPenalty;
  const cxImpactScore = Math.min(
    100,
    60 + loyaltyWeight * 10 + (option.compensationUsd > 0 ? 15 : 5) - delayPenalty * 0.2
  );

  return {
    optionId: option.optionId,
    flightLegId: option.flightLegId,
    score: Number(revenueImpactUsd.toFixed(2)),
    policy: option.policy,
    compensationUsd: option.compensationUsd,
    ancillaryRetentionOffers: [],
    cxImpactScore: Number(cxImpactScore.toFixed(1)),
    revenueImpactUsd: Number(revenueImpactUsd.toFixed(2)),
  };
}

export const iropsModule = {
  recommend(booking: BookingRecord): IropsRecommendation[] {
    const email = booking.passengers[0]?.email ?? 'guest@example.com';
    const profile = customerIntelligence.profile(email);
    offerManagement.assignExperiment(email);
    const retentionOffers = offerManagement.retentionBundle(email, profile.loyaltyTier);
    const ancillaryValueUsd = retentionOffers.reduce((sum, o) => sum + o.discountedPriceUsd, 0);
    const loyaltyWeight =
      profile.loyaltyTier === 'PLATINUM' ? 3 : profile.loyaltyTier === 'GOLD' ? 2 : profile.loyaltyTier === 'SILVER' ? 1 : 0;

    const options = bookingService.getRebookingOptions(booking.pnr);
    return options
      .map((opt) => {
        const rec = scoreOption(opt, booking, loyaltyWeight, ancillaryValueUsd);
        rec.ancillaryRetentionOffers = retentionOffers;
        return rec;
      })
      .sort((a, b) => b.score - a.score);
  },

  computeImpact(
    booking: BookingRecord,
    selected: IropsRecommendation,
    appliedAncillaryUsd: number
  ): CommercialImpactMetrics {
    const ancillaryUpsellUsd = appliedAncillaryUsd;
    const compensationCostUsd = selected.compensationUsd;
    const revenueRetainedUsd = booking.totalUsd;
    const netRevenueImpactUsd = revenueRetainedUsd + ancillaryUpsellUsd - compensationCostUsd;
    const cxScoreDelta = selected.cxImpactScore - 50;

    return {
      revenueRetainedUsd,
      ancillaryUpsellUsd,
      compensationCostUsd,
      netRevenueImpactUsd: Number(netRevenueImpactUsd.toFixed(2)),
      cxScoreDelta: Number(cxScoreDelta.toFixed(1)),
    };
  },

  async executeBest(
    booking: BookingRecord,
    recommendations: IropsRecommendation[]
  ): Promise<{ booking: BookingRecord; selected: IropsRecommendation; appliedAncillaryUsd: number } | null> {
    const best = recommendations[0];
    if (!best) return null;

    const options = bookingService.getRebookingOptions(booking.pnr);
    const matchedOption = options.find((row) => row.flightLegId === best.flightLegId);
    if (!matchedOption) return null;
    const rebooked = await bookingService.reaccommodate(
      booking.bookingId,
      matchedOption.optionId,
      options
    );
    if (!rebooked) return null;

    const ancillaries = best.ancillaryRetentionOffers.map((o) => ({
      code: o.code,
      label: `${o.label} (retention)`,
      priceUsd: o.discountedPriceUsd,
    }));
    const appliedAncillaryUsd = ancillaries.reduce((sum, a) => sum + a.priceUsd, 0);
    if (ancillaries.length > 0) {
      await bookingService.addAncillaries(rebooked.bookingId, ancillaries);
    }

    return { booking: bookingService.getById(rebooked.bookingId) ?? rebooked, selected: best, appliedAncillaryUsd };
  },
};
