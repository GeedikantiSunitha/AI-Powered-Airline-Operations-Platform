export interface EscalationStep {
  level: number;
  owner: string;
  channel: string;
  slaMinutes: number;
}

export interface IncidentPlaybook {
  id: string;
  title: string;
  trigger: string;
  detection: string;
  mitigation: string[];
  recovery: string[];
  escalation: EscalationStep[];
}

const PLAYBOOKS: IncidentPlaybook[] = [
  {
    id: 'ingestion-outage',
    title: 'Ingestion Pipeline Outage',
    trigger: 'PipelineFailures metric > 0 or ingestion lag > 10 min',
    detection: 'CloudWatch alarm pipeline-failure + SRE dashboard pipeline widget',
    mitigation: [
      'Pause downstream warehouse loads',
      'Switch to cached flight snapshot mode',
      'Notify data platform on-call',
    ],
    recovery: [
      'Replay failed events from raw S3 prefix',
      'Validate staging row counts',
      'Resume curated ETL jobs',
    ],
    escalation: [
      { level: 1, owner: 'Data Platform On-call', channel: 'PagerDuty', slaMinutes: 15 },
      { level: 2, owner: 'Operations Engineering Manager', channel: 'Slack #ops-incidents', slaMinutes: 30 },
      { level: 3, owner: 'Director of Operations Technology', channel: 'Bridge call', slaMinutes: 60 },
    ],
  },
  {
    id: 'model-endpoint-failure',
    title: 'Model Endpoint Failure',
    trigger: 'SageMaker endpoint 5xx or elevated inference latency',
    detection: 'Model health alarm + synthetic prediction check failure',
    mitigation: [
      'Route inference traffic to last-known-good model version',
      'Enable rule-based fallback scoring',
    ],
    recovery: [
      'Validate endpoint health checks',
      'Promote stable model package',
      'Run drift and quality validation suite',
    ],
    escalation: [
      { level: 1, owner: 'ML Platform On-call', channel: 'PagerDuty', slaMinutes: 15 },
      { level: 2, owner: 'MLOps Lead', channel: 'Slack #ml-ops', slaMinutes: 30 },
    ],
  },
  {
    id: 'opensearch-degradation',
    title: 'OpenSearch / Knowledge Retrieval Degradation',
    trigger: 'RAG retrieval latency > 3s or index cluster red status',
    detection: 'Agent groundedness drop + OpenSearch health alarm',
    mitigation: [
      'Serve copilot with operational data sources only',
      'Disable policy-heavy prompts requiring document citations',
    ],
    recovery: [
      'Fail over to healthy AZ/replica',
      'Rebuild index from latest curated corpus',
      'Re-run citation quality evaluation',
    ],
    escalation: [
      { level: 1, owner: 'AI Platform On-call', channel: 'PagerDuty', slaMinutes: 20 },
      { level: 2, owner: 'Security/Compliance Reviewer', channel: 'Email', slaMinutes: 45 },
    ],
  },
];

export const incidentPlaybooks = {
  list(): IncidentPlaybook[] {
    return PLAYBOOKS;
  },

  get(id: string): IncidentPlaybook | null {
    return PLAYBOOKS.find((row) => row.id === id) ?? null;
  },
};
