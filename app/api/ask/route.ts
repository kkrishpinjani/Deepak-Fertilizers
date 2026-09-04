import { NextRequest, NextResponse } from "next/server";
import { runActiveQuery } from "@/lib/dataMode";
import { matchQuestion } from "@/lib/nlMatch";
import { findQuery } from "@/lib/queries";
import { askCortexAnalyst, cortexConfigured } from "@/lib/cortexAnalyst";
import { executeSnowflake } from "@/lib/snowflake";
import { ollamaHealthy } from "@/lib/ollama";
import { llmMatchQuestion, llmSummarize } from "@/lib/copilot/llmMatch";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const question: string | undefined = body?.question;

  if (!question || !question.trim()) {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }

  // Real Cortex Analyst, when actually configured (dormant otherwise —
  // needs SNOWFLAKE_HOST, SNOWFLAKE_PAT, CORTEX_SEMANTIC_VIEW).
  if (cortexConfigured()) {
    const started = Date.now();
    try {
      const analyst = await askCortexAnalyst(question);
      if (!analyst.sql) {
        return NextResponse.json({
          matched: false,
          engine: "cortex-analyst",
          message: analyst.text || "Cortex Analyst did not return SQL for this question.",
          warnings: analyst.warnings,
        });
      }
      const rows = await executeSnowflake(analyst.sql);
      return NextResponse.json({
        matched: true,
        engine: "cortex-analyst",
        question,
        text: analyst.text,
        sql: analyst.sql,
        semanticView: analyst.semanticView,
        warnings: analyst.warnings,
        rows,
        executionMs: Date.now() - started,
      });
    } catch (err: any) {
      return NextResponse.json(
        { error: err?.message || "Cortex Analyst request failed", engine: "cortex-analyst" },
        { status: 500 }
      );
    }
  }

  // Real local LLM (Ollama/Qwen), when it's actually running. The LLM
  // only picks one of the app's existing verified queries and writes a
  // summary of the real result — it doesn't generate SQL itself.
  if (await ollamaHealthy()) {
    const started = Date.now();
    try {
      const llmMatch = await llmMatchQuestion(question);
      if (llmMatch.id) {
        const query = findQuery(llmMatch.id)!;
        const rows = await runActiveQuery(query.sql);
        const text = await llmSummarize(question, rows).catch(() => undefined);
        return NextResponse.json({
          matched: true,
          engine: "ollama",
          confidence: llmMatch.confidence,
          id: query.id,
          question: query.question,
          text,
          sql: query.sql.trim(),
          rows,
          executionMs: Date.now() - started,
        });
      }
    } catch (err: any) {
      // Fall through to keyword matching below rather than failing the
      // whole request — Ollama being slow/odd shouldn't break "Ask".
      console.error("[api/ask] Ollama path failed, falling back:", err?.message || err);
    }
  }

  // Fallback: keyword-matched verified query against the active
  // data source (MySQL by default).
  const match = matchQuestion(question);

  if (!match.query) {
    return NextResponse.json({
      matched: false,
      engine: "keyword-match",
      confidence: match.confidence,
      message:
        "No verified query matched confidently. Try one of these, or rephrase:",
      suggestions: match.alternates,
    });
  }

  const started = Date.now();
  try {
    const rows = await runActiveQuery(match.query.sql);
    return NextResponse.json({
      matched: true,
      engine: "keyword-match",
      confidence: match.confidence,
      id: match.query.id,
      question: match.query.question,
      sql: match.query.sql.trim(),
      rows,
      executionMs: Date.now() - started,
      alternates: match.alternates.slice(1),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Query failed", engine: "keyword-match" },
      { status: 500 }
    );
  }
}
