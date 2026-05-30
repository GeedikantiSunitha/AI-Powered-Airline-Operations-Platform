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

/** Phase 17 — booking and reservations */
export type FareClass = 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS';
export type BookingStatus =
  | 'HELD'
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'TICKETED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'REACCOMMODATED';

export interface FlightSearchResult {
  flightLegId: string;
  flightNumber: string;
  /** Marketing carrier name (e.g. Air India). */
  airlineName: string;
  origin: string;
  destination: string;
  scheduledDeparture: string;
  scheduledArrival: string;
  availableSeats: number;
  fareFromUsd: number;
}

export interface FareQuote {
  quoteId: string;
  flightLegId: string;
  fareClass: FareClass;
  baseFareUsd: number;
  taxesUsd: number;
  totalUsd: number;
  currency: string;
  expiresAt: string;
}

export interface SeatMapSeat {
  seatId: string;
  row: number;
  column: string;
  fareClass: FareClass;
  available: boolean;
  priceUsd: number;
}

export interface SeatMap {
  flightLegId: string;
  rows: number;
  columns: string[];
  seats: SeatMapSeat[];
  overbookingLimitPct: number;
}

export interface PassengerDetail {
  firstName: string;
  lastName: string;
  email: string;
  documentId?: string;
}

export interface BookingHold {
  holdId: string;
  flightLegId: string;
  fareClass: FareClass;
  passengers: PassengerDetail[];
  seatIds: string[];
  expiresAt: string;
  totalUsd: number;
}

export interface BookingRecord {
  bookingId: string;
  pnr: string;
  status: BookingStatus;
  flightLegId: string;
  fareClass: FareClass;
  passengers: PassengerDetail[];
  seatIds: string[];
  ancillaries: Array<{ code: string; label: string; priceUsd: number }>;
  totalUsd: number;
  paymentId?: string;
  ticketNumbers: string[];
  /** User who created the booking — used for PNR access control */
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentResult {
  paymentId: string;
  status: 'succeeded' | 'failed' | 'pending';
  idempotencyKey: string;
  fraudRiskScore: number;
  retryCount: number;
}

export interface RebookingOption {
  optionId: string;
  flightLegId: string;
  flightNumber: string;
  policy: string;
  compensationUsd: number;
  departure: string;
}

export interface BookingLifecycleEvent {
  eventType: string;
  bookingId: string;
  pnr: string;
  payload: Record<string, unknown>;
  emittedAt: string;
}

/** Phase 18 — commercial optimization */
export type CustomerSegmentId = 'LEISURE' | 'BUSINESS' | 'LOYALTY_GOLD' | 'LOYALTY_PLATINUM';

export interface DynamicFareRecommendation {
  flightLegId: string;
  fareClass: FareClass;
  baseFareUsd: number;
  demandIndex: number;
  loadFactorPct: number;
  priceMultiplier: number;
  recommendedFareUsd: number;
  rationale: string;
}

export interface AncillaryOffer {
  offerId: string;
  code: 'BAG' | 'SEAT' | 'MEAL' | 'LOUNGE';
  label: string;
  basePriceUsd: number;
  experimentVariant: string;
  discountedPriceUsd: number;
  conversionLiftPct: number;
}

export interface ExperimentAssignment {
  experimentId: string;
  variant: 'control' | 'treatment_a' | 'treatment_b';
  assignedAt: string;
}

export interface CustomerProfile {
  customerId: string;
  segment: CustomerSegmentId;
  loyaltyTier: 'NONE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  lifetimeValueUsd: number;
  recommendations: Array<{ type: string; message: string; priority: number }>;
}

export interface IropsRecommendation {
  optionId: string;
  flightLegId: string;
  score: number;
  policy: string;
  compensationUsd: number;
  ancillaryRetentionOffers: AncillaryOffer[];
  cxImpactScore: number;
  revenueImpactUsd: number;
}

export interface CommercialImpactMetrics {
  revenueRetainedUsd: number;
  ancillaryUpsellUsd: number;
  compensationCostUsd: number;
  netRevenueImpactUsd: number;
  cxScoreDelta: number;
}

export interface DisruptionOptimizationResult {
  flightLegId: string;
  pnr: string;
  selectedRecommendation: IropsRecommendation;
  executed: boolean;
  booking: BookingRecord;
  impact: CommercialImpactMetrics;
  experiment: ExperimentAssignment;
}

export interface RevenueDashboard {
  funnel: {
    searches: number;
    quotes: number;
    holds: number;
    bookings: number;
    tickets: number;
    conversionRatePct: number;
  };
  revenue: {
    grossBookingUsd: number;
    ancillaryUsd: number;
    refundsUsd: number;
    netUsd: number;
  };
  operationalConstraints: Array<{
    flightLegId: string;
    flightNumber: string;
    status: FlightStatus;
    delayMinutes: number;
    estimatedConversionImpactPct: number;
  }>;
  recentOptimizations: Array<{
    pnr: string;
    netRevenueImpactUsd: number;
    cxScoreDelta: number;
    executedAt: string;
  }>;
}
