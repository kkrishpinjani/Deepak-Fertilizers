import { NextResponse } from "next/server";
import { runEvalSuite } from "@/lib/copilot/evalRunner";
import { runQuery } from "@/lib/db";

export async function POST() {
  try {
    const result = await runEvalSuite();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Eval run failed" }, { status: 500 });
  }
}

export async function GET() {
  const runs = await runQuery(`
    SELECT id, run_at, question_id, intent_actual, intent_pass, kpi_expected, kpi_actual, kpi_pass, guards_pass, latency_ms, overall_pass
    FROM conformed.copilot_eval_runs
    ORDER BY run_at DESC
    LIMIT 100;
  `);
  return NextResponse.json({ runs });
}
