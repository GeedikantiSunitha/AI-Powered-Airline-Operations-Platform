/**
 * Phase 8 — Bedrock converse API + RAG context
 */
import type { CopilotMessage, DelayPrediction, FlightLeg } from '@airline-ops/shared';
import { flightService } from '../flights/flightService';
import { sagemakerClient } from '../prediction/sagemakerClient';
import { kpiService } from '../kpi/kpiService';
import { knowledgeBase } from './knowledgeBase';

interface CopilotCitationSource {
  source: string;
  reference: string;
  documentId?: string;
  section?: string;
  confidence?: number;
}

export interface CopilotAnswer {
  message: CopilotMessage;
  sources: CopilotCitationSource[];
}

function formatRiskLine(flight: FlightLeg, prediction: DelayPrediction): string {
  return `${flight.flightNumber} (${flight.origin}->${flight.destination}) risk ${(prediction.delayProbability * 100).toFixed(
    0
  )}% predicted delay ${prediction.predictedDelayMinutes} min`;
}

export const bedrockClient = {
  async chat(messages: Array<{ role: string; content: string }>): Promise<CopilotAnswer> {
    const userPrompt = messages[messages.length - 1]?.content?.toLowerCase() ?? '';
    const flights = await flightService.list({});
    const predictions = (
      await Promise.all(
        flights.map(async (flight) => ({
          flight,
          prediction: await sagemakerClient.predictDelay(flight.flightLegId),
        }))
      )
    ).filter(
      (row): row is { flight: FlightLeg; prediction: DelayPrediction } => row.prediction !== null
    );

    if (userPrompt.includes('high delay risk') || userPrompt.includes('next 3 hours')) {
      const top = predictions
        .sort((a, b) => b.prediction.delayProbability - a.prediction.delayProbability)
        .slice(0, 3);
      const responseText =
        top.length === 0
          ? 'No delay-risk predictions are currently available.'
          : `Top high-risk flights in current live set:\n- ${top
              .map((row) => formatRiskLine(row.flight, row.prediction))
              .join('\n- ')}`;
      return {
        message: {
          role: 'assistant',
          content: responseText,
          confidence: top.length > 0 ? top[0].prediction.delayProbability : 0.35,
        },
        sources: [
          { source: 'predictions.delay.batch', reference: '/api/v1/predictions/delay/batch' },
          { source: 'flights.list', reference: '/api/v1/flights' },
        ],
      };
    }

    if (userPrompt.includes('kpi') || userPrompt.includes('otp')) {
      const summary = await kpiService.getSummary(7);
      return {
        message: {
          role: 'assistant',
          content: `Last 7-day KPIs: OTP ${summary.onTimePerformancePct.toFixed(
            2
          )}%, avg delay ${summary.avgDelayMinutes.toFixed(
            2
          )} min, cancellation ${summary.cancellationRatePct.toFixed(2)}%.`,
          confidence: 0.8,
        },
        sources: [{ source: 'kpi.summary', reference: '/api/v1/kpi/summary?days=7' }],
      };
    }

    const knowledge = knowledgeBase.search(messages[messages.length - 1]?.content ?? '');
    if (knowledge) {
      return {
        message: {
          role: 'assistant',
          content: `Grounded answer from policy knowledge base:\n${knowledge.answer}`,
          confidence: knowledge.citations[0]?.confidence ?? 0.7,
          citations: knowledge.citations.map((citation) => ({
            source: citation.documentId,
            reference: citation.section,
          })),
        },
        sources: knowledge.citations.map((citation) => ({
          source: 'knowledge.document',
          reference: `${citation.documentId}#${citation.section}`,
          documentId: citation.documentId,
          section: citation.section,
          confidence: citation.confidence,
        })),
      };
    }

    return {
      message: {
        role: 'assistant',
        content:
          'I can answer delay-risk, KPI, and policy/compliance questions grounded in live operations and indexed knowledge docs. Try: "crew duty policy for disruption reassignments".',
        confidence: 0.6,
      },
      sources: [
        { source: 'copilot.capabilities', reference: 'delay-risk,kpi,knowledge-rag' },
        { source: 'flights.list', reference: '/api/v1/flights' },
      ],
    };
  },
};
