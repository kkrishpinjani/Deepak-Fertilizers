// Real multi-agent composition (V16). Rather than a single monolithic
// resolver, each intent belongs to a specialized agent's domain. When a
// question's language spans more than one domain (e.g. "Why is EBITDA
// below plan and which vendors are driving it?"), the orchestrator in
// engine.ts runs the primary agent's resolver as the main answer AND a
// secondary agent's resolver for corroborating evidence — a genuinely
// different SQL query from a different domain, not a relabeled version
// of the same one.

import { Intent } from "./intent";
import { resolveIntent, ResolvedAnswer } from "./resolvers";

export type AgentName = "finance" | "supply_chain";

export const AGENT_FOR_INTENT: Record<Intent, AgentName> = {
  variance_root_cause: "finance",
  ranked_driver: "finance",
  ar_risk: "finance",
  working_capital: "finance",
  general_finance: "finance",
  inventory_risk: "supply_chain",
  procurement_variance: "supply_chain",
  production_attainment: "supply_chain",
};

const DOMAIN_KEYWORDS: Record<AgentName, string[]> = {
  finance: ["ebitda", "revenue", "margin", "receivable", "cash", "payable", "profit", "working capital", "collections"],
  supply_chain: ["inventory", "stock", "vendor", "supplier", "purchase price", "ppv", "production", "plant", "material", "procurement"],
};

// The intent each secondary agent leads with when it's pulled in purely
// for corroboration (not the primary answer) — its single most general
// "what's wrong in my domain right now" query.
const AGENT_DEFAULT_INTENT: Record<AgentName, Intent> = {
  finance: "ranked_driver",
  supply_chain: "procurement_variance",
};

export function detectAgents(question: string, primaryIntent: Intent): AgentName[] {
  const q = question.toLowerCase();
  const primaryAgent = AGENT_FOR_INTENT[primaryIntent];
  const agents = new Set<AgentName>([primaryAgent]);
  (Object.keys(DOMAIN_KEYWORDS) as AgentName[]).forEach((agent) => {
    if (agent === primaryAgent) return;
    if (DOMAIN_KEYWORDS[agent].some((k) => q.includes(k))) agents.add(agent);
  });
  return Array.from(agents);
}

export async function runSecondaryAgent(agent: AgentName): Promise<{ agent: AgentName; answer: ResolvedAnswer }> {
  const answer = await resolveIntent(AGENT_DEFAULT_INTENT[agent]);
  return { agent, answer };
}

export const AGENT_LABEL: Record<AgentName, string> = {
  finance: "Finance Agent",
  supply_chain: "Supply Chain Agent",
};
