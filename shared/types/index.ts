/**
 * Canonical types — keep in sync with docs/DATA_MODEL.md
 */

export type FlightStatus =
  | 'SCHEDULED'
  | 'BOARDING'
  | 'DEPARTED'
  | 'ARRIVED'
  | 'DELAYED'
  | 'CANCELLED';

export type UserRole =
  | 'admin'
  | 'operations_manager'
  | 'crew_manager'
  | 'analyst'
  | 'viewer';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface FlightLeg {
  flightLegId: string;
  flightNumber: string;
  origin: string;
  destination: string;
  scheduledDeparture: string;
  scheduledArrival: string;
  estimatedDeparture?: string;
  estimatedArrival?: string;
  status: FlightStatus;
  aircraftRegistration: string;
  gate?: string;
  delayMinutes?: number;
}

export interface DelayPrediction {
  flightLegId: string;
  predictedAt: string;
  delayProbability: number;
  predictedDelayMinutes: number;
  topFactors: Array<{ factor: string; weight: number }>;
}

/** Phase 12 — unified prediction contract across ML models */
export type PredictionModelId =
  | 'flight_delay_v1'
  | 'weather_impact_v1'
  | 'passenger_disruption_v1'
  | 'maintenance_risk_v1';

export interface FeatureAttribution {
  factor: string;
  weight: number;
  contributionPct?: number;
}

export interface ModelExplainability {
  topFactors: FeatureAttribution[];
  shapSummary: string;
}

export interface UnifiedModelPrediction<TOutput = Record<string, unknown>> {
  model: PredictionModelId;
  version: string;
  flightLegId?: string;
  aircraftRegistration?: string;
  predictedAt: string;
  confidence: number;
  features: Record<string, number | string | boolean>;
  output: TOutput;
  explainability: ModelExplainability;
}

export interface DelayModelOutput {
  delayProbability: number;
  predictedDelayMinutes: number;
}

export interface WeatherModelOutput {
  routeWeatherRiskScore: number;
  originImpactScore: number;
  destinationImpactScore: number;
  estimatedOperationalDelayMinutes: number;
}

export interface PassengerDisruptionOutput {
  misconnectRiskScore: number;
  compensationExposureUsd: number;
  affectedPassengerEstimate: number;
  rebookingPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface MaintenanceModelOutput {
  aircraftRiskScore: number;
  recommendedAction: string;
  componentAtRisk: string;
  inspectionWindowHours: number;
}

export interface FlightScenarioPredictions {
  flightLegId: string;
  predictedAt: string;
  predictions: {
    delay: UnifiedModelPrediction<DelayModelOutput>;
    weather: UnifiedModelPrediction<WeatherModelOutput>;
    passengerImpact: UnifiedModelPrediction<PassengerDisruptionOutput>;
    maintenance: UnifiedModelPrediction<MaintenanceModelOutput>;
  };
}

/** Phase 13 — MLOps registry, drift, pipelines */
export type ModelStage = 'dev' | 'staging' | 'prod';

export type ModelVersionStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'archived';

export interface ModelVersionRecord {
  modelId: string;
  version: string;
  stage: ModelStage;
  artifactUri: string;
  metrics: Record<string, number>;
  registeredAt: string;
  status: ModelVersionStatus;
  isLastKnownGood: boolean;
}

export interface ApprovalGate {
  gateId: string;
  modelId: string;
  fromVersion: string;
  toVersion: string;
  targetStage: ModelStage;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  resolvedAt?: string;
}

export interface DriftReport {
  modelId: string;
  activeVersion: string;
  driftScore: number;
  dataQualityScore: number;
  threshold: number;
  alertTriggered: boolean;
  checkedAt: string;
  features: Array<{ name: string; psi: number; breached: boolean }>;
}

export interface PipelineRun {
  runId: string;
  pipelineId: string;
  status: 'running' | 'succeeded' | 'failed';
  startedAt: string;
  completedAt?: string;
  steps: Array<{ name: string; status: string }>;
}

export interface RollbackResult {
  modelId: string;
  rolledBackFrom: string;
  rolledBackTo: string;
  stage: ModelStage;
  executedAt: string;
  approvalGateId?: string;
}

export interface Alert {
  alertId: string;
  type: string;
  severity: AlertSeverity;
  flightLegId?: string;
  message: string;
  createdAt: string;
  acknowledged: boolean;
}

export interface KpiSummary {
  period: string;
  onTimePerformancePct: number;
  avgDelayMinutes: number;
  cancellationRatePct: number;
  baggageDelayRatePct: number;
  crewUtilizationPct: number;
  passengerImpactScore: number;
  fuelEfficiencyPct: number;
}

export interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{ source: string; reference: string }>;
  confidence?: number;
}

/** Phase 14 — multi-agent orchestration */
export interface AgentStepResult {
  agent: string;
  content: string;
  reasoningSummary: string;
  runtime: 'bedrock-agent' | 'local-stub';
  sources: Array<{ source: string; reference: string }>;
  toolCalls: Array<{
    name: string;
    input: Record<string, unknown>;
    allowed: boolean;
    sensitivity: 'read' | 'write' | 'high_impact';
    blockedReason?: string;
  }>;
  confidence: number;
}

export interface MultiStepOrchestrationResult {
  supervisorPlan: string[];
  steps: AgentStepResult[];
  recommendation: string;
  toolCalls: AgentStepResult['toolCalls'];
  approvalRequired: boolean;
  approvalRequest?: {
    approvalId: string;
    status: 'pending' | 'approved' | 'rejected';
    recommendation: string;
  } | null;
  latencyMs: number;
}
