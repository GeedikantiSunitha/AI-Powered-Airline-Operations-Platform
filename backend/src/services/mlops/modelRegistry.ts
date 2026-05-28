import { randomUUID } from 'crypto';
import type { ApprovalGate, ModelStage, ModelVersionRecord } from '@airline-ops/shared';

const DRIFT_THRESHOLD = Number(process.env.ML_DRIFT_THRESHOLD ?? 0.25);
const DATA_QUALITY_MIN = Number(process.env.ML_DATA_QUALITY_MIN ?? 0.85);

let versions: ModelVersionRecord[] = seedVersions();

const approvalGates: ApprovalGate[] = [];

function seedVersions(): ModelVersionRecord[] {
  return [
    {
      modelId: 'flight_delay_v1',
      version: '1.1.0',
      stage: 'prod',
      artifactUri: 's3://airline-ops-models/prod/flight_delay_v1/1.1.0/model.tar.gz',
      metrics: { auc: 0.91, rmse: 8.4 },
      registeredAt: '2026-05-10T08:00:00.000Z',
      status: 'active',
      isLastKnownGood: true,
    },
    {
      modelId: 'flight_delay_v1',
      version: '1.2.0',
      stage: 'staging',
      artifactUri: 's3://airline-ops-models/staging/flight_delay_v1/1.2.0/model.tar.gz',
      metrics: { auc: 0.89, rmse: 9.8 },
      registeredAt: '2026-05-20T12:00:00.000Z',
      status: 'approved',
      isLastKnownGood: false,
    },
    {
      modelId: 'weather_impact_v1',
      version: '1.0.0',
      stage: 'prod',
      artifactUri: 's3://airline-ops-models/prod/weather_impact_v1/1.0.0/model.tar.gz',
      metrics: { auc: 0.86, rmse: 0.12 },
      registeredAt: '2026-05-18T09:00:00.000Z',
      status: 'active',
      isLastKnownGood: true,
    },
  ];
}

function stageOrder(stage: ModelStage): number {
  return { dev: 0, staging: 1, prod: 2 }[stage];
}

export const modelRegistry = {
  resetForTests(): void {
    versions = seedVersions();
    approvalGates.length = 0;
  },

  listVersions(modelId?: string): ModelVersionRecord[] {
    return versions.filter((row) => !modelId || row.modelId === modelId);
  },

  getActiveProdVersion(modelId: string): ModelVersionRecord | null {
    const active = versions.filter(
      (row) => row.modelId === modelId && row.stage === 'prod' && row.status === 'active'
    );
    return active.length > 0 ? active[active.length - 1] : null;
  },

  getLastKnownGood(modelId: string): ModelVersionRecord | null {
    return (
      versions.find((row) => row.modelId === modelId && row.isLastKnownGood) ??
      versions.find((row) => row.modelId === modelId && row.stage === 'prod') ??
      null
    );
  },

  registerVersion(input: {
    modelId: string;
    version: string;
    stage: ModelStage;
    artifactUri: string;
    metrics: Record<string, number>;
  }): ModelVersionRecord {
    const record: ModelVersionRecord = {
      ...input,
      registeredAt: new Date().toISOString(),
      status: input.stage === 'prod' ? 'pending_approval' : 'approved',
      isLastKnownGood: false,
    };
    versions.unshift(record);
    return record;
  },

  promote(modelId: string, version: string, targetStage: ModelStage): ApprovalGate | ModelVersionRecord {
    const record = versions.find((row) => row.modelId === modelId && row.version === version);
    if (!record) {
      throw new Error('Model version not found');
    }
    if (stageOrder(targetStage) <= stageOrder(record.stage)) {
      throw new Error('Promotion target stage must be ahead of current stage');
    }

    if (targetStage === 'prod') {
      const gate: ApprovalGate = {
        gateId: randomUUID(),
        modelId,
        fromVersion: modelRegistry.getActiveProdVersion(modelId)?.version ?? 'none',
        toVersion: version,
        targetStage,
        reason: `Promotion approval required for ${modelId}@${version}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      approvalGates.unshift(gate);
      record.status = 'pending_approval';
      return gate;
    }

    record.stage = targetStage;
    record.status = 'approved';
    return record;
  },

  approveGate(gateId: string): ModelVersionRecord {
    const gate = approvalGates.find((row) => row.gateId === gateId);
    if (!gate) throw new Error('Approval gate not found');
    if (gate.status !== 'pending') throw new Error('Approval gate is not pending');

    const record = versions.find(
      (row) => row.modelId === gate.modelId && row.version === gate.toVersion
    );
    if (!record) throw new Error('Target model version not found');

    versions
      .filter((row) => row.modelId === gate.modelId)
      .forEach((row) => {
        row.isLastKnownGood = false;
      });

    const currentProd = versions.find(
      (row) =>
        row.modelId === gate.modelId && row.stage === 'prod' && row.status === 'active'
    );
    if (currentProd) {
      currentProd.status = 'archived';
      currentProd.isLastKnownGood = true;
    }

    record.stage = 'prod';
    record.status = 'active';
    record.isLastKnownGood = false;
    gate.status = 'approved';
    gate.resolvedAt = new Date().toISOString();
    return record;
  },

  listApprovalGates(): ApprovalGate[] {
    return [...approvalGates];
  },

  createDriftApprovalGate(modelId: string, activeVersion: string, driftScore: number): ApprovalGate {
    const lkg = modelRegistry.getLastKnownGood(modelId);
    const gate: ApprovalGate = {
      gateId: randomUUID(),
      modelId,
      fromVersion: activeVersion,
      toVersion: lkg?.version ?? activeVersion,
      targetStage: 'prod',
      reason: `Drift score ${driftScore.toFixed(2)} exceeded threshold ${DRIFT_THRESHOLD}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    approvalGates.unshift(gate);
    return gate;
  },

  rollbackToLastKnownGood(modelId: string): ModelVersionRecord {
    const active = modelRegistry.getActiveProdVersion(modelId);
    const lkg = modelRegistry.getLastKnownGood(modelId);
    if (!lkg) throw new Error('No last-known-good model version found');
    if (!active) throw new Error('No active production model found');

    versions
      .filter((row) => row.modelId === modelId)
      .forEach((row) => {
        row.isLastKnownGood = false;
      });

    if (active.version !== lkg.version) {
      active.status = 'archived';
      active.stage = 'staging';
      active.isLastKnownGood = false;
    }

    lkg.stage = 'prod';
    lkg.status = 'active';
    lkg.isLastKnownGood = true;
    return lkg;
  },

  thresholds() {
    return { driftThreshold: DRIFT_THRESHOLD, dataQualityMin: DATA_QUALITY_MIN };
  },
};
