import type { ApprovalGate, DriftReport, RollbackResult } from '@airline-ops/shared';
import { driftMonitor } from './driftMonitor';
import { modelRegistry } from './modelRegistry';
import { rollbackService } from './rollbackService';

export interface DriftRollbackDrillResult {
  drift: DriftReport;
  approvalGate: ApprovalGate;
  rollback: RollbackResult;
}

export const mlopsOrchestrator = {
  simulateDriftWithRollback(modelId: string, driftScore = 0.42): DriftRollbackDrillResult {
    const drift = driftMonitor.evaluate(modelId, driftScore);
    if (!drift.alertTriggered) {
      throw new Error('Simulated drift score did not breach threshold');
    }

    const approvalGate = modelRegistry.createDriftApprovalGate(
      modelId,
      drift.activeVersion,
      drift.driftScore
    );
    const rollback = rollbackService.execute(modelId, approvalGate.gateId);

    return { drift, approvalGate, rollback };
  },
};
