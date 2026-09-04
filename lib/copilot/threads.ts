// Real persistent conversation threads, backed by MySQL. A thread is
// created once per copilot session in the UI; every investigation
// (including drill-downs) appends a message. Follow-up questions get
// the real prior context passed into the LLM rationale prompt.

import { runParamQuery } from "@/lib/db";

export async function createThread(title?: string): Promise<string> {
  const id = `THR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await runParamQuery(`INSERT INTO conformed.copilot_threads (id, title) VALUES (?, ?);`, [id, title || null]);
  return id;
}

export type ThreadMessage = {
  seq: number;
  question: string;
  drill_dimension: string | null;
  kpi_name: string | null;
  kpi_actual: number | null;
  kpi_plan: number | null;
  top_driver: string | null;
  answer_summary: string | null;
};

export async function getThreadMessages(threadId: string): Promise<ThreadMessage[]> {
  return runParamQuery<ThreadMessage>(
    `SELECT seq, question, drill_dimension, kpi_name, kpi_actual, kpi_plan, top_driver, answer_summary
     FROM conformed.copilot_thread_messages WHERE thread_id = ? ORDER BY seq;`,
    [threadId]
  );
}

export async function appendThreadMessage(
  threadId: string,
  msg: {
    question: string;
    drillDimension?: string | null;
    kpiName: string;
    kpiActual: number;
    kpiPlan: number;
    topDriver: string | null;
    answerSummary: string;
  }
) {
  const [{ maxSeq }] = await runParamQuery<{ maxSeq: number | null }>(
    `SELECT MAX(seq) AS maxSeq FROM conformed.copilot_thread_messages WHERE thread_id = ?;`,
    [threadId]
  );
  const seq = (maxSeq ?? 0) + 1;
  await runParamQuery(
    `INSERT INTO conformed.copilot_thread_messages
       (thread_id, seq, question, drill_dimension, kpi_name, kpi_actual, kpi_plan, top_driver, answer_summary)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [threadId, seq, msg.question, msg.drillDimension || null, msg.kpiName, msg.kpiActual, msg.kpiPlan, msg.topDriver, msg.answerSummary]
  );
  return seq;
}

export function formatThreadContext(messages: ThreadMessage[]): string {
  if (!messages.length) return "";
  return messages
    .map((m) => `Q: ${m.question}\nA: ${m.kpi_name} was ${m.kpi_actual} vs plan ${m.kpi_plan}. Top driver: ${m.top_driver}. ${m.answer_summary || ""}`)
    .join("\n\n");
}
