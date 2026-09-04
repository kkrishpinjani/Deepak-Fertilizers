// Real LLM-based intent classification for the CFO Copilot, using the
// local Ollama/Qwen model. Falls back to the rule-based classifier in
// intent.ts if Ollama isn't reachable — same governed shape either
// way: the LLM only ever picks one of the known intents, it doesn't
// generate SQL or free-form logic.

import { ollamaGenerateJson } from "@/lib/ollama";
import { Intent, classifyIntent } from "./intent";

const INTENTS: Intent[] = [
  "variance_root_cause",
  "ranked_driver",
  "ar_risk",
  "inventory_risk",
  "procurement_variance",
  "production_attainment",
  "working_capital",
  "general_finance",
];

export async function classifyIntentSmart(question: string): Promise<{ intent: Intent; via: "ollama" | "rules" }> {
  try {
    const prompt = `Classify this CFO question into exactly one category from this list: ${INTENTS.join(", ")}.

variance_root_cause: EBITDA/profit variance, "why is X below plan"
ranked_driver: "which/top/highest/largest" ranking questions with no specific category below
ar_risk: accounts receivable, overdue, customer cash risk
inventory_risk: inventory, stock, slow-moving, obsolete
procurement_variance: vendor, supplier, purchase price variance
production_attainment: production output vs plan
working_capital: working capital, payables, cash conversion
general_finance: anything else

Question: "${question.replace(/"/g, "'")}"

Respond with ONLY JSON: {"intent": "<one of the categories above>"}`;

    const result = await ollamaGenerateJson<{ intent: string }>(prompt, 15000);
    if (INTENTS.includes(result.intent as Intent)) {
      return { intent: result.intent as Intent, via: "ollama" };
    }
  } catch {
    // Ollama down/slow/malformed — fall through to rules.
  }
  return { intent: classifyIntent(question), via: "rules" };
}
