import { describe, expect, it, beforeEach } from 'vitest';
import { metricsStore } from './metricsStore';

describe('metricsStore', () => {
  beforeEach(() => {
    metricsStore.resetIncidentCounters();
  });

  it('meets SLO with healthy snapshot defaults', () => {
    const snapshot = metricsStore.getSnapshot();
    expect(metricsStore.meetsSlo(snapshot)).toBe(true);
    expect(snapshot.apiErrorRatePct).toBeLessThanOrEqual(1);
  });

  it('fails SLO when pipeline health degrades', () => {
    metricsStore.recordPipelineFailure();
    metricsStore.recordPipelineFailure();
    metricsStore.recordPipelineFailure();
    metricsStore.recordPipelineFailure();
    const snapshot = metricsStore.getSnapshot();
    expect(snapshot.pipelineHealthScore).toBeLessThan(0.95);
    expect(metricsStore.meetsSlo(snapshot)).toBe(false);
  });
});
