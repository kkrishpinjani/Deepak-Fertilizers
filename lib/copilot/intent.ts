// Question -> intent classification. Ported from the v17 "CFO Copilot"
// package's backend/planner/intent.ts. This is rule-based (keyword
// matching), not an LLM call — same honest approach as lib/nlMatch.ts.
// There is no LLM API key in this environment, so this is the real
// mechanism, not a stand-in for one.
//
// Note: short ambiguous tokens ("ar", "ap", "top") use word-boundary
// matching, not substring — plain .includes("ar") would misfire on
// "largest", "standard", "chart" etc. Found this the hard way while
// testing "largest purchase price variance" above.

export type Intent =
  | "variance_root_cause"
  | "ranked_driver"
  | "ar_risk"
  | "inventory_risk"
  | "procurement_variance"
  | "production_attainment"
  | "working_capital"
  | "general_finance";

function hasWord(q: string, word: string): boolean {
  return new RegExp(`\\b${word}\\b`).test(q);
}

export function classifyIntent(question: string): Intent {
  const q = question.toLowerCase();

  if (q.includes("ebitda") || q.includes("below plan") || q.includes("why is") || q.includes("why did"))
    return "variance_root_cause";

  if (q.includes("vendor") || q.includes("purchase price") || hasWord(q, "ppv") || q.includes("supplier"))
    return "procurement_variance";

  if (hasWord(q, "ar") || q.includes("receivable") || q.includes("overdue") || q.includes("cash risk"))
    return "ar_risk";

  if (q.includes("inventory") || q.includes("stock") || q.includes("slow moving") || q.includes("obsolete"))
    return "inventory_risk";

  if (q.includes("production") || q.includes("output") || q.includes("units"))
    return "production_attainment";

  if (q.includes("working capital") || q.includes("payable") || q.includes("cash conversion"))
    return "working_capital";

  if (q.includes("which") || hasWord(q, "top") || q.includes("highest") || q.includes("largest"))
    return "ranked_driver";

  return "general_finance";
}
