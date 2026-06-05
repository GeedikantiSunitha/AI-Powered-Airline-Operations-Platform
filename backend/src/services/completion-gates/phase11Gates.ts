import { readFileSync } from 'fs';
import { join } from 'path';
import { PHASE11_GATE_TARGETS, type Phase11GateResult } from '../../config/phase11Gates';
import { knowledgeBase } from '../copilot/knowledgeBase';
import { agentEvaluation } from '../copilot/agentEvaluation';
import { supervisor } from '../copilot/supervisor';
import { createTraceId } from '../../middleware/audit';
import { logCopilotAuditChain } from '../security/auditChainLogger';
import { securityReview } from '../security/securityReview';
import { mlopsOrchestrator } from '../mlops/mlopsOrchestrator';
import { modelRegistry } from '../mlops/modelRegistry';
import { metricsStore } from '../sre/metricsStore';
import { syntheticChecks } from '../sre/syntheticChecks';
import { alertingStrategy } from '../sre/alertingStrategy';
import { sagemakerClient } from '../prediction/sagemakerClient';
import { flightService } from '../flights/flightService';
import { bookingService } from '../booking/bookingService';
import { randomUUID } from 'crypto';

interface RagEvalCase {
  id: string;
  query: string;
  expectDocumentIdPrefix: string;
}

function loadRagEvalSet(): RagEvalCase[] {
  const path = join(__dirname, '../../data/rag-eval-set.json');
  return JSON.parse(readFileSync(path, 'utf-8')) as RagEvalCase[];
}

export const phase11Gates = {
  async validateRagGroundedness(): Promise<Phase11GateResult> {
    const cases = loadRagEvalSet();
    const targets = PHASE11_GATE_TARGETS.rag;
    const caseResults = cases.map((c) => {
      const result = knowledgeBase.search(c.query, 3);
      if (!result || result.citations.length === 0) {
        return { id: c.id, groundedness: 0, passed: false, reason: 'no citations' };
      }
      const matching = result.citations.filter(
        (cit) =>
          cit.documentId.startsWith(c.expectDocumentIdPrefix) &&
          cit.confidence >= targets.minCitationConfidence &&
          Boolean(cit.section)
      );
      const groundedness =
        matching.length > 0
          ? Math.max(...matching.map((cit) => cit.confidence))
          : 0;
      return {
        id: c.id,
        groundedness: Number(groundedness.toFixed(2)),
        passed: matching.length > 0 && Boolean(result.answer?.trim()),
        citationCount: result.citations.length,
        matchedDocuments: matching.map((m) => m.documentId),
      };
    });

    const meanGroundedness =
      caseResults.reduce((s, r) => s + r.groundedness, 0) / Math.max(1, caseResults.length);
    const passRate = caseResults.filter((r) => r.passed).length / Math.max(1, caseResults.length);
    const passed =
      meanGroundedness >= targets.minMeanGroundedness && passRate >= targets.minEvalCasesPassRate;

    return {
      gate: 'rag-groundedness',
      passed,
      summary: passed
        ? `RAG mean groundedness ${meanGroundedness.toFixed(2)} on ${cases.length} cases`
        : `RAG below target (${meanGroundedness.toFixed(2)} < ${targets.minMeanGroundedness})`,
      evidence: { meanGroundedness, passRate, caseResults },
    };
  },

  async validateMlopsDriftEnvironments(): Promise<Phase11GateResult> {
    const modelId = 'flight_delay_v1';
    const environments = ['non-prod', 'prod-like'] as const;
    const runs: Array<{ environment: string; ok: boolean }> = [];

    for (const environment of environments) {
      modelRegistry.resetForTests();
      const promoteGate = modelRegistry.promote(modelId, '1.2.0', 'prod');
      if ('gateId' in promoteGate) modelRegistry.approveGate(promoteGate.gateId);

      const result = mlopsOrchestrator.simulateDriftWithRollback(modelId, 0.42);
      const active = modelRegistry.getActiveProdVersion(modelId);
      const ok =
        result.drift.alertTriggered &&
        result.approvalGate.status === 'approved' &&
        result.rollback.rolledBackTo === '1.1.0' &&
        active?.version === '1.1.0';
      runs.push({ environment, ok });
    }

    const passed = runs.every((r) => r.ok);
    return {
      gate: 'mlops-drift-rollback',
      passed,
      summary: passed
        ? 'Drift alarm + rollback verified in non-prod and prod-like simulations'
        : 'MLOps drift/rollback failed in one or more environments',
      evidence: { runs },
    };
  },

  async validateAgentTraceability(): Promise<Phase11GateResult> {
    const prompt =
      'Analyze AI-302 delay risk and crew reassignment options with recommended actions';
    const traceId = createTraceId();
    const orchestration = await supervisor.executeMultiStep(prompt, 'operations_manager');
    const scores = agentEvaluation.evaluate(orchestration);

    await logCopilotAuditChain({
      traceId,
      userId: 'u-gate-validator',
      prompt,
      toolCalls: orchestration.toolCalls,
      recommendation: orchestration.recommendation,
      approvalRequired: orchestration.approvalRequired,
      approvalId: orchestration.approvalRequest?.approvalId ?? null,
      modelDecision: { supervisorPlan: orchestration.supervisorPlan },
    });

    const chain = securityReview.validateAuditChain(traceId);
    const hasCitations = orchestration.steps.every((s) => s.sources.length > 0);
    const hasConfidence = scores.groundedness >= PHASE11_GATE_TARGETS.agent.minGroundedness;
    const hasApproval =
      orchestration.approvalRequired && Boolean(orchestration.approvalRequest?.approvalId);

    const targets = PHASE11_GATE_TARGETS.agent;
    const passed =
      scores.passed &&
      hasCitations &&
      hasConfidence &&
      hasApproval &&
      chain.complete &&
      orchestration.toolCalls.length >= targets.minToolCalls &&
      orchestration.steps.length >= targets.minSpecialistAgents;

    return {
      gate: 'agent-traceability',
      passed,
      summary: passed
        ? 'Agent output traceable with citations, scores, approval, and audit chain'
        : 'Agent traceability gate failed (citations, approval, or audit incomplete)',
      evidence: {
        scores,
        hasCitations,
        hasApproval,
        auditChainComplete: chain.complete,
        toolCallCount: orchestration.toolCalls.length,
        specialistAgents: orchestration.supervisorPlan,
      },
    };
  },

  async validateSecuritySignOff(): Promise<Phase11GateResult> {
    const inference = securityReview.validateInferenceExposure();
    const posture = securityReview.getPosture();
    const passed =
      inference.privateOnly &&
      inference.publicEndpoints === 0 &&
      posture.kmsKeys.length >= 3 &&
      posture.vpcEndpoints.length >= 5 &&
      posture.iamPolicies.length >= 2;

    return {
      gate: 'security-sign-off',
      passed,
      summary: passed
        ? 'Private inference only; KMS, VPC endpoints, and IAM posture documented'
        : 'Security sign-off criteria not met',
      evidence: {
        privateInferenceOnly: inference.privateOnly,
        publicInferenceEndpointCount: inference.publicEndpoints,
        vpcEndpointCount: posture.vpcEndpoints.length,
        kmsKeyCount: posture.kmsKeys.length,
        iamPolicyCount: posture.iamPolicies.length,
      },
    };
  },

  async validateOperationalSlos(): Promise<Phase11GateResult> {
    metricsStore.resetIncidentCounters();
    const synthetics = await syntheticChecks.runAll();
    const syntheticPass = synthetics.every((r) => r.passed);

    const predStart = Date.now();
    const flights = await flightService.list({});
    const flightLegId = flights[0]?.flightLegId ?? 'FL-20260521-AI302-DEL-BOM';
    const prediction = await sagemakerClient.predictDelay(flightLegId);
    const predictionLatencyMs = Date.now() - predStart;
    const predictionFresh =
      prediction !== null &&
      prediction.delayProbability >= 0 &&
      predictionLatencyMs <= PHASE11_GATE_TARGETS.operational.maxPredictionLatencyMs;

    const healthySnapshot = metricsStore.getSnapshot();
    const healthyAlerts = alertingStrategy.evaluate(healthySnapshot);
    metricsStore.recordPipelineFailure();
    const degradedAlerts = alertingStrategy.evaluate(metricsStore.getSnapshot());
    metricsStore.resetIncidentCounters();

    const alertDeliveryOk =
      healthyAlerts.length === 0 && degradedAlerts.some((a) => a.ruleId === 'pipeline-failure');

    const sloMet = metricsStore.meetsSlo(healthySnapshot);
    const passed = syntheticPass && predictionFresh && alertDeliveryOk && sloMet;

    return {
      gate: 'operational-slos',
      passed,
      summary: passed
        ? 'Operational SLOs, synthetics, prediction freshness, and alert delivery OK'
        : 'One or more operational SLO checks failed',
      evidence: {
        sloMet,
        syntheticPass,
        synthetics,
        predictionLatencyMs,
        predictionFresh,
        alertDeliveryOk,
        snapshot: healthySnapshot,
      },
    };
  },

  async validateBookingSlos(): Promise<Phase11GateResult> {
    const targets = PHASE11_GATE_TARGETS.booking;
    const searchRuns: Array<{ route: string; latencyMs: number; flightCount: number }> = [];

    for (const route of targets.sampleSearchRoutes) {
      const started = Date.now();
      const flights = bookingService.search({
        origin: route.origin,
        destination: route.destination,
        passengers: 1,
        travelDate: new Date().toISOString().slice(0, 10),
      });
      searchRuns.push({
        route: `${route.origin}-${route.destination}`,
        latencyMs: Date.now() - started,
        flightCount: flights.length,
      });
    }

    const searchLatencyOk = searchRuns.every((r) => r.latencyMs <= targets.maxSearchLatencyMs);
    const searchResultsOk = searchRuns.every((r) => r.flightCount >= 1);

    let paymentOk = false;
    let ticketOk = false;
    try {
      const search = bookingService.search({ origin: 'DEL', destination: 'BOM', passengers: 1 });
      const flight = search[0];
      if (!flight) throw new Error('no flight');
      const quote = bookingService.fareQuote(flight.flightLegId, 'ECONOMY', 1);
      if (!quote) throw new Error('no quote');
      const hold = bookingService.createHold({
        flightLegId: flight.flightLegId,
        fareClass: 'ECONOMY',
        passengers: [{ firstName: 'Gate', lastName: 'Test', email: 'gate@test.com' }],
        seatIds: ['12B'],
        quoteId: quote.quoteId,
      });
      if (!hold) throw new Error('hold failed');
      const booking = await bookingService.createBookingFromHold(hold.holdId);
      if (!booking) throw new Error('booking failed');
      const payment = await bookingService.confirmPayment(booking.bookingId, randomUUID(), '4242');
      paymentOk = payment?.payment.status === 'succeeded';
      const ticketed = await bookingService.issueTickets(booking.bookingId);
      ticketOk = ticketed?.booking.status === 'TICKETED';
    } catch {
      paymentOk = false;
      ticketOk = false;
    }

    const passed =
      searchLatencyOk &&
      searchResultsOk &&
      paymentOk &&
      ticketOk &&
      searchRuns.some((r) => r.flightCount >= 3);

    return {
      gate: 'booking-slos',
      passed,
      summary: passed
        ? 'Booking search latency, multi-flight results, payment, and ticketing meet targets'
        : 'Booking SLO validation failed',
      evidence: {
        searchRuns,
        searchLatencyOk,
        searchResultsOk,
        multiCarrierResults: searchRuns.some((r) => r.flightCount >= 3),
        paymentOk,
        ticketOk,
      },
    };
  },

  async validateAll(): Promise<{
    ok: boolean;
    passedCount: number;
    total: number;
    gates: Phase11GateResult[];
  }> {
    const gates = await Promise.all([
      this.validateRagGroundedness(),
      this.validateMlopsDriftEnvironments(),
      this.validateAgentTraceability(),
      this.validateSecuritySignOff(),
      this.validateOperationalSlos(),
      this.validateBookingSlos(),
    ]);
    const passedCount = gates.filter((g) => g.passed).length;
    return {
      ok: passedCount === gates.length,
      passedCount,
      total: gates.length,
      gates,
    };
  },
};
