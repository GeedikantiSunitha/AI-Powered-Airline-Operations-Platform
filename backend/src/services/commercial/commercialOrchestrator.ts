import type { DisruptionOptimizationResult } from '@airline-ops/shared';
import { mockFlights } from '../../data/mockFlights';
import { bookingService } from '../booking/bookingService';
import { commercialEvents } from './commercialEvents';
import { customerIntelligence } from './customerIntelligence';
import { iropsModule } from './iropsModule';
import { offerManagement } from './offerManagement';
import { revenueDashboard } from './revenueDashboard';

export const commercialOrchestrator = {
  async optimizeDisruption(input: {
    flightLegId: string;
    pnr: string;
  }): Promise<DisruptionOptimizationResult | null> {
    const flight = mockFlights.find((f) => f.flightLegId === input.flightLegId);
    const booking = bookingService.getByPnr(input.pnr);
    if (!flight || !booking) return null;
    if (!['TICKETED', 'CONFIRMED', 'REACCOMMODATED'].includes(booking.status)) return null;

    const email = booking.passengers[0]?.email ?? 'guest@example.com';
    const profile = customerIntelligence.profile(email);
    const experiment = offerManagement.assignExperiment(email);
    const recommendations = iropsModule.recommend(booking);
    const executed = await iropsModule.executeBest(booking, recommendations);
    if (!executed) return null;

    const impact = iropsModule.computeImpact(
      booking,
      executed.selected,
      executed.appliedAncillaryUsd
    );

    revenueDashboard.recordOptimization(booking.pnr, impact.netRevenueImpactUsd, impact.cxScoreDelta);
    commercialEvents.emit('CommercialOptimizationExecuted', {
      flightLegId: input.flightLegId,
      pnr: booking.pnr,
      optionId: executed.selected.optionId,
      netRevenueImpactUsd: impact.netRevenueImpactUsd,
      cxScoreDelta: impact.cxScoreDelta,
      experimentId: experiment.experimentId,
      segment: profile.segment,
    });

    return {
      flightLegId: input.flightLegId,
      pnr: booking.pnr,
      selectedRecommendation: executed.selected,
      executed: true,
      booking: executed.booking,
      impact,
      experiment,
    };
  },
};
