/**
 * Phase 6 / 12 — SageMaker delay endpoint facade (local mock via delayModel)
 */
import type { DelayPrediction } from '@airline-ops/shared';
import { flightService } from '../flights/flightService';
import { delayModel } from './models/delayModel';

export const sagemakerClient = {
  async predictDelay(flightLegId: string): Promise<DelayPrediction | null> {
    const flight = await flightService.getById(flightLegId);
    if (!flight) return null;
    return delayModel.predictLegacy(flight);
  },
};
