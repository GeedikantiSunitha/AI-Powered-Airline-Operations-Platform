/**
 * Phase 13 checkpoint — simulate drift, open approval gate, rollback to LKG model.
 */
import { mlopsOrchestrator } from '../services/mlops/mlopsOrchestrator';
import { modelRegistry } from '../services/mlops/modelRegistry';

async function run(): Promise<void> {
  const modelId = 'flight_delay_v1';
  modelRegistry.resetForTests();

  const promoteGate = modelRegistry.promote(modelId, '1.2.0', 'prod');
  if ('gateId' in promoteGate) {
    modelRegistry.approveGate(promoteGate.gateId);
  }

  const result = mlopsOrchestrator.simulateDriftWithRollback(modelId, 0.42);
  const active = modelRegistry.getActiveProdVersion(modelId);
  const checkpointPassed =
    result.drift.alertTriggered &&
    result.approvalGate.status === 'approved' &&
    result.rollback.rolledBackFrom === '1.2.0' &&
    result.rollback.rolledBackTo === '1.1.0' &&
    active?.version === '1.1.0' &&
    active.isLastKnownGood === true;

  console.log(
    JSON.stringify(
      {
        ok: checkpointPassed,
        driftAlert: result.drift.alertTriggered,
        approvalGateId: result.approvalGate.gateId,
        approvalGateStatus: result.approvalGate.status,
        rolledBackFrom: result.rollback.rolledBackFrom,
        rolledBackTo: result.rollback.rolledBackTo,
        activeProdVersion: active?.version,
        activeIsLastKnownGood: active?.isLastKnownGood,
      },
      null,
      2
    )
  );

  if (!checkpointPassed) {
    process.exitCode = 1;
  }
}

void run();
