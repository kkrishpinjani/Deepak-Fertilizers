// Builds a multi-step "ontology traversal" investigation plan from a
// question — which business entities it touches and which tools
// (ontology lookup, analytics query, evidence search, validation) the
// investigation needs. Ported from v17's backend/orchestration/
// investigationPlan.ts. Pure string matching against the entity/term
// dictionary — the same conformed-model dimensions this project already
// has real MySQL tables for.

const TERMS = [
  ["EBITDA", ["ebitda", "operating profit", "earnings"]],
  ["Revenue", ["revenue", "sales", "turnover"]],
  ["Margin", ["margin", "gross profit", "gross margin"]],
  ["Inventory", ["inventory", "stock", "slow moving"]],
  ["AR", ["receivable", "ar aging", "collections", "overdue"]],
  ["AP", ["payable", "ap aging", "vendor payment"]],
  ["Cash", ["cash", "liquidity", "cash conversion"]],
  ["Plan", ["plan", "budget", "forecast", "actual", "variance", "scenario"]],
  ["Customer", ["customer", "client"]],
  ["Material", ["material", "product", "sku"]],
  ["Plant", ["plant", "site", "factory"]],
  ["Vendor", ["vendor", "supplier"]],
  ["CostCenter", ["cost center"]],
  ["ProfitCenter", ["profit center"]],
] as const;

export type InvestigationStep = {
  id: string;
  tool: "ONTOLOGY" | "ANALYTICS" | "EVIDENCE" | "CALCULATION" | "VALIDATE" | "RESPOND";
  purpose: string;
  required: boolean;
};

export type InvestigationPlan = {
  question: string;
  entities: string[];
  steps: InvestigationStep[];
  complexity: "SINGLE_STEP" | "MULTI_STEP";
};

export function buildInvestigationPlan(question: string): InvestigationPlan {
  const q = question.toLowerCase();
  const entities = TERMS.filter(([, keywords]) => keywords.some((k) => q.includes(k))).map(([name]) => name);

  const steps: InvestigationStep[] = [];
  const why = /why|driver|root cause|explain/.test(q);
  const compare = /vs|versus|plan|budget|forecast|variance|actual/.test(q);

  steps.push({ id: "S1", tool: "ONTOLOGY", purpose: "Identify the relevant business entities and their relationships in the conformed model.", required: true });
  steps.push({
    id: "S2",
    tool: "ANALYTICS",
    purpose: compare ? "Quantify actual vs plan for the requested metric." : "Quantify the requested metric.",
    required: true,
  });
  if (why) {
    steps.push({ id: "S3", tool: "ANALYTICS", purpose: "Decompose the metric by dimension to rank the drivers.", required: true });
  }
  if (/calculate|impact|scenario|what if|sensitivity/.test(q)) {
    steps.push({ id: `S${steps.length + 1}`, tool: "CALCULATION", purpose: "Run a controlled scenario calculation.", required: true });
  }
  steps.push({ id: `S${steps.length + 1}`, tool: "EVIDENCE", purpose: "Search contracts, policies and commentary for supporting context on the top driver.", required: false });
  steps.push({ id: `S${steps.length + 1}`, tool: "VALIDATE", purpose: "Check the query, entities and result for safety and sanity.", required: true });
  steps.push({ id: `S${steps.length + 1}`, tool: "RESPOND", purpose: "Produce a conclusion, evidence and a recommended next step.", required: true });

  return { question, entities, steps, complexity: steps.length >= 5 ? "MULTI_STEP" : "SINGLE_STEP" };
}
