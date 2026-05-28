import { getAuditChain } from '../../middleware/audit';

export interface InferenceEndpointPosture {
  name: string;
  exposure: 'private' | 'public';
  vpcOnly: boolean;
  publicAccessEnabled: boolean;
}

export interface SecurityPosture {
  vpcEndpoints: string[];
  inferenceEndpoints: InferenceEndpointPosture[];
  kmsKeys: Array<{ scope: string; alias: string }>;
  iamPolicies: string[];
  privateInferenceOnly: boolean;
  publicInferenceEndpointCount: number;
}

const REQUIRED_AUDIT_ACTIONS = [
  'user.prompt_received',
  'ai.tool_calls_executed',
  'ai.recommendation_generated',
  'ai.approval_state_recorded',
];

const INFERENCE_ENDPOINTS: InferenceEndpointPosture[] = [
  {
    name: 'flight-delay-v1',
    exposure: 'private',
    vpcOnly: true,
    publicAccessEnabled: false,
  },
  {
    name: 'weather-impact-v1',
    exposure: 'private',
    vpcOnly: true,
    publicAccessEnabled: false,
  },
  {
    name: 'passenger-disruption-v1',
    exposure: 'private',
    vpcOnly: true,
    publicAccessEnabled: false,
  },
];

export const securityReview = {
  getPosture(): SecurityPosture {
    const publicCount = INFERENCE_ENDPOINTS.filter((row) => row.publicAccessEnabled).length;
    return {
      vpcEndpoints: ['s3', 'bedrock_runtime', 'sagemaker_api', 'sagemaker_runtime', 'secretsmanager', 'opensearch'],
      inferenceEndpoints: INFERENCE_ENDPOINTS,
      kmsKeys: [
        { scope: 'data_lake', alias: 'alias/airline-ops-dev-data-lake' },
        { scope: 'warehouse', alias: 'alias/airline-ops-dev-warehouse' },
        { scope: 'model_artifacts', alias: 'alias/airline-ops-dev-model-artifacts' },
      ],
      iamPolicies: [
        'least-priv-lambda',
        'least-priv-api',
        'security-guardrails',
      ],
      privateInferenceOnly: publicCount === 0,
      publicInferenceEndpointCount: publicCount,
    };
  },

  validateInferenceExposure(): { publicEndpoints: number; privateOnly: boolean } {
    const publicEndpoints = INFERENCE_ENDPOINTS.filter((row) => row.publicAccessEnabled).length;
    return { publicEndpoints, privateOnly: publicEndpoints === 0 };
  },

  validateAuditChain(traceId: string): {
    complete: boolean;
    missing: string[];
    events: ReturnType<typeof getAuditChain>;
  } {
    const events = getAuditChain(traceId);
    const actions = new Set(events.map((event) => event.action));
    const missing = REQUIRED_AUDIT_ACTIONS.filter((action) => !actions.has(action));
    return { complete: missing.length === 0, missing, events };
  },
};
