/**
 * Phase 9 / 14 — Supervisor routing + Bedrock agent orchestration
 */
import type { FlightLeg, MultiStepOrchestrationResult, UserRole } from '@airline-ops/shared';
import { randomUUID } from 'crypto';
import { flightService } from '../flights/flightService';
import { sagemakerClient } from '../prediction/sagemakerClient';
import { agentTools } from './agentTools';
import { bedrockAgentRuntime } from './bedrockAgentRuntime';
import { toolPolicy } from './toolPolicy';

export type AgentName =
  | 'flight-delay'
  | 'crew-coordination'
  | 'airport-congestion'
  | 'fuel-optimization'
  | 'passenger-impact';

export interface AgentExecutionResult {
  agent: AgentName;
  content: string;
  sources: Array<{ source: string; reference: string }>;
  toolCalls: Array<{ name: string; input: Record<string, unknown> }>;
  confidence: number;
}

const AGENT_TOOL_SET: Record<AgentName, string[]> = {
  'flight-delay': [
    'get_flight_status',
    'query_delay_predictions',
    'get_weather_risk',
    'get_airport_congestion',
  ],
  'crew-coordination': ['list_crew_assignments', 'suggest_crew_swap'],
  'airport-congestion': ['get_airport_congestion', 'get_flight_status'],
  'fuel-optimization': ['get_fuel_variance', 'get_flight_status'],
  'passenger-impact': ['get_passenger_connections', 'get_flight_status'],
};

function detectAgents(userMessage: string): AgentName[] {
  const text = userMessage.toLowerCase();
  const agents = new Set<AgentName>();

  if (/delay|risk|eta|late|rotation|weather/.test(text)) agents.add('flight-delay');
  if (/crew|duty|reassign|swap|legality/.test(text)) agents.add('crew-coordination');
  if (/congestion|runway|gate|slot/.test(text)) agents.add('airport-congestion');
  if (/fuel|burn|uplift/.test(text)) agents.add('fuel-optimization');
  if (/passenger|rebook|misconnect|compensation/.test(text)) agents.add('passenger-impact');

  if (agents.size === 0) agents.add('flight-delay');
  return [...agents];
}

function isMultiStepQuery(userMessage: string): boolean {
  return detectAgents(userMessage).length >= 2 || /and|with|plus|multi|both/.test(userMessage.toLowerCase());
}

async function runAgentStep(
  agent: AgentName,
  userMessage: string,
  flight: FlightLeg,
  role: UserRole
): Promise<MultiStepOrchestrationResult['steps'][number]> {
  const tools = AGENT_TOOL_SET[agent];
  const toolResults = await Promise.all(
    tools.map((toolName) => {
      const input =
        toolName === 'get_airport_congestion'
          ? { airportIata: flight.origin }
          : { flightLegId: flight.flightLegId };
      return agentTools.invoke(toolName, input, flight, role);
    })
  );

  const allowedCalls = toolResults.filter((row) => row.allowed);
  const summaries = allowedCalls.map((row) => {
    if (row.name === 'query_delay_predictions') {
      const output = row.output as { delayProbability?: number; predictedDelayMinutes?: number } | null;
      return `Delay risk ${((output?.delayProbability ?? 0) * 100).toFixed(0)}%, predicted slip ${output?.predictedDelayMinutes ?? 0} min.`;
    }
    if (row.name === 'list_crew_assignments') {
      const crew = row.output as Array<{ role: string; legal: boolean }>;
      const illegal = crew.find((member) => !member.legal);
      return illegal
        ? 'Crew legality violation detected for CAPTAIN assignment.'
        : 'Crew roster is legal.';
    }
    if (row.name === 'suggest_crew_swap') {
      const output = row.output as { recommendation?: string };
      return output.recommendation ?? 'No crew swap required.';
    }
    if (row.name === 'get_airport_congestion') {
      const output = row.output as { score?: number; airportIata?: string };
      return `Airport ${output.airportIata} congestion ${((output.score ?? 0) * 100).toFixed(0)}%.`;
    }
    if (row.name === 'get_passenger_connections') {
      const output = row.output as { affectedPassengers?: number; missedConnections?: number };
      return `${output.affectedPassengers ?? 0} passengers affected, ${output.missedConnections ?? 0} misconnects.`;
    }
    if (row.name === 'get_fuel_variance') {
      const output = row.output as { variancePct?: number };
      return `Fuel variance ${output.variancePct ?? 0}%.`;
    }
    return `${row.name} completed.`;
  });

  const invocation = await bedrockAgentRuntime.invoke({
    agent,
    vars: {
      flightNumber: flight.flightNumber,
      flightLegId: flight.flightLegId,
      origin: flight.origin,
    },
    toolSummaries: summaries,
  });

  const confidence =
    agent === 'flight-delay'
      ? ((await sagemakerClient.predictDelay(flight.flightLegId))?.delayProbability ?? 0.7)
      : 0.8;

  return {
    agent,
    content: `${agent} specialist: ${invocation.content}`,
    reasoningSummary: invocation.reasoningSummary,
    runtime: invocation.runtime,
    sources: [{ source: `agent.${agent}`, reference: flight.flightLegId }],
    toolCalls: toolResults.map((row) => ({
      name: row.name,
      input: row.input,
      allowed: row.allowed,
      sensitivity: row.sensitivity,
      blockedReason: row.blockedReason,
    })),
    confidence,
  };
}

export const supervisor = {
  async route(userMessage: string): Promise<AgentName> {
    return detectAgents(userMessage)[0] ?? 'flight-delay';
  },

  routeMulti(userMessage: string): AgentName[] {
    const agents = detectAgents(userMessage);
    return isMultiStepQuery(userMessage) ? agents.slice(0, 3) : [agents[0]];
  },

  async execute(userMessage: string, role: UserRole = 'operations_manager'): Promise<AgentExecutionResult> {
    const multi = await this.executeMultiStep(userMessage, role);
    const first = multi.steps[0];
    return {
      agent: first.agent as AgentName,
      content: multi.recommendation,
      sources: multi.steps.flatMap((step) => step.sources),
      toolCalls: multi.toolCalls
        .filter((call) => call.allowed)
        .map((call) => ({ name: call.name, input: call.input })),
      confidence:
        multi.steps.reduce((sum, step) => sum + step.confidence, 0) / Math.max(1, multi.steps.length),
    };
  },

  async executeMultiStep(
    userMessage: string,
    role: UserRole = 'operations_manager'
  ): Promise<MultiStepOrchestrationResult> {
    const started = Date.now();
    const plan = this.routeMulti(userMessage);
    const flights = await flightService.list({});
    const primaryFlight =
      flights.find((f) => userMessage.includes(f.flightNumber.replace('AI-', ''))) ?? flights[0];

    if (!primaryFlight) {
      return {
        supervisorPlan: plan,
        steps: [],
        recommendation: 'No flight context available right now.',
        toolCalls: [],
        approvalRequired: false,
        approvalRequest: null,
        latencyMs: Date.now() - started,
      };
    }

    const steps = [];
    for (const agent of plan) {
      steps.push(await runAgentStep(agent, userMessage, primaryFlight, role));
    }

    const toolCalls = steps.flatMap((step) => step.toolCalls);
    const highImpact = toolCalls.some(
      (call) => call.allowed && toolPolicy.requiresApproval(call.sensitivity)
    );
    const recommendation = [
      `Multi-agent recommendation for ${primaryFlight.flightNumber}:`,
      ...steps.map((step, index) => `${index + 1}. ${step.content}`),
      highImpact
        ? 'High-impact crew action detected; human approval required before execution.'
        : 'No high-impact action requires approval.',
    ].join('\n');

    return {
      supervisorPlan: plan,
      steps,
      recommendation,
      toolCalls,
      approvalRequired: highImpact,
      approvalRequest: highImpact
        ? {
            approvalId: randomUUID(),
            status: 'pending',
            recommendation,
          }
        : null,
      latencyMs: Date.now() - started,
    };
  },
};
