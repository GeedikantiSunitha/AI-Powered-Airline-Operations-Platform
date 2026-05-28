import type { AgentName } from './supervisor';

export interface PromptChain {
  system: string;
  analyze: string;
  recommend: string;
}

export const PROMPT_TEMPLATES: Record<AgentName, PromptChain> = {
  'flight-delay': {
    system:
      'You are a flight delay analysis specialist. Use operational data and ML predictions only.',
    analyze:
      'Analyze delay drivers for flight {flightNumber} ({flightLegId}) including inbound delay, weather, and congestion.',
    recommend:
      'Recommend the top mitigation actions for operations control within the next 3 hours.',
  },
  'crew-coordination': {
    system:
      'You are a crew coordination specialist. Prioritize duty legality and reserve activation policy.',
    analyze:
      'Evaluate crew legality and duty risk for flight {flightNumber} ({flightLegId}).',
    recommend:
      'Recommend crew reassignment options that restore legal roster before departure.',
  },
  'airport-congestion': {
    system:
      'You are an airport congestion specialist focused on gate and runway pressure.',
    analyze:
      'Assess congestion at {origin} and downstream impact for {flightNumber}.',
    recommend:
      'Recommend gate/runway actions to reduce departure queue risk.',
  },
  'fuel-optimization': {
    system: 'You are a fuel optimization specialist for planned vs actual burn variance.',
    analyze: 'Analyze fuel variance for {flightNumber} ({flightLegId}).',
    recommend: 'Recommend fuel-saving actions without compromising safety buffers.',
  },
  'passenger-impact': {
    system:
      'You are a passenger disruption specialist focused on misconnect and rebooking priority.',
    analyze:
      'Estimate passenger impact and misconnect risk for delayed flight {flightNumber}.',
    recommend:
      'Recommend rebooking priority tiers and compensation guardrails.',
  },
};

export function buildPromptChain(
  agent: AgentName,
  vars: Record<string, string>
): { system: string; userPrompt: string } {
  const template = PROMPT_TEMPLATES[agent];
  const replace = (text: string) =>
    Object.entries(vars).reduce((acc, [key, value]) => acc.replace(`{${key}}`, value), text);

  return {
    system: template.system,
    userPrompt: `${replace(template.analyze)}\n\n${replace(template.recommend)}`,
  };
}
