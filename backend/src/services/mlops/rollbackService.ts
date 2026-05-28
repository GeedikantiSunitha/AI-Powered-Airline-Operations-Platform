import type { RollbackResult } from '@airline-ops/shared';
import { modelRegistry } from './modelRegistry';

export const rollbackService = {
  execute(modelId: string, approvalGateId?: string): RollbackResult {
    const active = modelRegistry.getActiveProdVersion(modelId);
    if (!active) throw new Error('No active production model found');

    const restored = modelRegistry.rollbackToLastKnownGood(modelId);
    if (approvalGateId) {
      const gates = modelRegistry.listApprovalGates();
      const gate = gates.find((row) => row.gateId === approvalGateId);
      if (gate && gate.status === 'pending') {
        gate.status = 'approved';
        gate.resolvedAt = new Date().toISOString();
      }
    }

    return {
      modelId,
      rolledBackFrom: active.version,
      rolledBackTo: restored.version,
      stage: 'prod',
      executedAt: new Date().toISOString(),
      approvalGateId,
    };
  },
};
