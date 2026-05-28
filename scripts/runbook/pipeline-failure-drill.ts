import { handler } from '../../ingestion/lambdas/alert-trigger/handler';

async function run(): Promise<void> {
  const event = {
    source: 'airline.ops.pipeline',
    'detail-type': 'PipelineFailure',
    detail: {
      pipeline: 'flight-event-processor',
      failureStage: 'staging-load',
      reason: 'DB timeout while inserting stg_flight_events',
      occurredAt: new Date().toISOString(),
    },
  };

  const result = await handler(event);
  console.log('pipeline-failure-drill', result.body);
}

void run();

