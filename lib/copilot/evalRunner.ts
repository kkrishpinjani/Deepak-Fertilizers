// V12's verified-query evaluation/regression framework, for real:
// runs the actual copilot engine against a fixed set of gold
// questions, computes fresh ground truth from the same conformed
// model, and checks intent routing + KPI accuracy + guard status —
// logging every run so accuracy can be tracked over time, not just
// asserted.

import { runQuery, runParamQuery } from "@/lib/db";
import { runInvestigation } from "./engine";

export type GoldQuestion = {
  id: string;
  question: string;
  expected_intent: string;
  ground_truth_sql: string;
  tolerance_percent: number;
};

export async function runEvalSuite() {
  const questions = await runQuery<GoldQuestion>(`SELECT * FROM conformed.copilot_gold_questions ORDER BY id;`);
  const results = [];

  for (const q of questions) {
    const started = Date.now();
    const [truth] = await runQuery<{ actual: number }>(q.ground_truth_sql);
    const expected = Number(truth?.actual ?? 0);

    let outcome: any;
    try {
      outcome = await runInvestigation(q.question);
    } catch (err: any) {
      outcome = null;
    }
    const latency = Date.now() - started;

    const intentActual = outcome?.intent ?? "ERROR";
    const intentPass = intentActual === q.expected_intent;
    const kpiActual = outcome?.kpi?.actual ?? null;
    const tolerance = Math.abs(expected) * (q.tolerance_percent / 100) + 1;
    const kpiPass = kpiActual !== null && Math.abs(kpiActual - expected) <= tolerance;
    const guardsPass = outcome ? outcome.guards.sql.valid && outcome.guards.ontology.valid && outcome.guards.result.valid : false;
    const overallPass = intentPass && kpiPass && guardsPass;

    await runParamQuery(
      `INSERT INTO conformed.copilot_eval_runs
         (question_id, intent_actual, intent_pass, kpi_expected, kpi_actual, kpi_pass, guards_pass, latency_ms, overall_pass)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [q.id, intentActual, intentPass ? 1 : 0, expected, kpiActual, kpiPass ? 1 : 0, guardsPass ? 1 : 0, latency, overallPass ? 1 : 0]
    );

    results.push({
      id: q.id,
      question: q.question,
      expectedIntent: q.expected_intent,
      intentActual,
      intentPass,
      kpiExpected: expected,
      kpiActual,
      kpiPass,
      guardsPass,
      overallPass,
      latencyMs: latency,
    });
  }

  return {
    total: results.length,
    passed: results.filter((r) => r.overallPass).length,
    results,
  };
}
