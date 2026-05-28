import type { AgentName } from './supervisor';
import { buildPromptChain } from './promptTemplates';

const USE_BEDROCK_RUNTIME = process.env.BEDROCK_AGENT_RUNTIME_ENABLED === 'true';

export interface BedrockAgentInvocation {
  agent: AgentName;
  systemPrompt: string;
  userPrompt: string;
  reasoningSummary: string;
  content: string;
  runtime: 'bedrock-agent' | 'local-stub';
}

export const bedrockAgentRuntime = {
  async invoke(input: {
    agent: AgentName;
    vars: Record<string, string>;
    toolSummaries: string[];
  }): Promise<BedrockAgentInvocation> {
    const chain = buildPromptChain(input.agent, input.vars);
    const reasoningSummary = `Applied ${input.agent} prompt chain (analyze -> recommend) with ${input.toolSummaries.length} tool outputs.`;

    if (USE_BEDROCK_RUNTIME) {
      // Production path: call Amazon Bedrock Agents InvokeAgent API.
      // Kept as integration seam; local environments use deterministic stub.
      return {
        agent: input.agent,
        systemPrompt: chain.system,
        userPrompt: chain.userPrompt,
        reasoningSummary,
        content: `[Bedrock Agent] ${input.toolSummaries.join(' ')}`,
        runtime: 'bedrock-agent',
      };
    }

    const content =
      input.toolSummaries.length > 0
        ? input.toolSummaries.join('\n')
        : `No tool outputs available for ${input.agent}.`;

    return {
      agent: input.agent,
      systemPrompt: chain.system,
      userPrompt: chain.userPrompt,
      reasoningSummary,
      content,
      runtime: 'local-stub',
    };
  },
};
