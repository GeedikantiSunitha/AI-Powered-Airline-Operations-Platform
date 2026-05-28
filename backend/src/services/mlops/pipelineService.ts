import { randomUUID } from 'crypto';
import type { PipelineRun } from '@airline-ops/shared';
import { modelRegistry } from './modelRegistry';

const PIPELINES = [
  {
    pipelineId: 'delay-prediction-pipeline',
    description: 'Train, evaluate, approve, and deploy flight delay model',
    steps: ['PreprocessFeatures', 'TrainModel', 'EvaluateModel', 'RegisterModel', 'DeployEndpoint'],
  },
  {
    pipelineId: 'multi-model-refresh-pipeline',
    description: 'Batch refresh for weather, passenger, and maintenance models',
    steps: ['BuildFeatures', 'TrainModels', 'EvaluateModels', 'RegisterModels'],
  },
];

const runs: PipelineRun[] = [];

export const pipelineService = {
  listPipelines() {
    return PIPELINES;
  },

  listRuns(pipelineId?: string): PipelineRun[] {
    return runs.filter((run) => !pipelineId || run.pipelineId === pipelineId);
  },

  async startRun(pipelineId: string): Promise<PipelineRun> {
    const pipeline = PIPELINES.find((row) => row.pipelineId === pipelineId);
    if (!pipeline) throw new Error('Pipeline not found');

    const run: PipelineRun = {
      runId: randomUUID(),
      pipelineId,
      status: 'running',
      startedAt: new Date().toISOString(),
      steps: pipeline.steps.map((name) => ({ name, status: 'running' })),
    };
    runs.unshift(run);

    // Local stub completes immediately with success.
    run.status = 'succeeded';
    run.completedAt = new Date().toISOString();
    run.steps = run.steps.map((step) => ({ ...step, status: 'succeeded' }));

    if (pipelineId === 'delay-prediction-pipeline') {
      modelRegistry.registerVersion({
        modelId: 'flight_delay_v1',
        version: `1.2.${runs.length}`,
        stage: 'dev',
        artifactUri: 's3://airline-ops-models/dev/flight_delay_v1/latest/model.tar.gz',
        metrics: { auc: 0.9, rmse: 9.1 },
      });
    }

    return run;
  },
};
