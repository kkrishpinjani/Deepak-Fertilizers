// Real LLM-based question routing, using the local Ollama/Qwen model.
// The LLM only ever picks one of the app's existing verified queries
// (by id) and writes a plain-English summary of the real result rows
// — it never generates free-form SQL itself. That keeps the same
// governance property the rest of this app has (SQL comes from a
// fixed, reviewed list), while using the LLM for the parts it's
// actually good at: understanding a loosely-phrased question, and
// writing a natural summary of a real result.

import { ollamaGenerateJson, ollamaGenerate } from "@/lib/ollama";
import { VERIFIED_QUERIES } from "@/lib/queries";

export type LlmMatchResult = { id: string | null; confidence: number };

export async function llmMatchQuestion(question: string): Promise<LlmMatchResult> {
  const catalog = VERIFIED_QUERIES.map((q) => `- id: "${q.id}" | question: "${q.question}" | about: ${q.description}`).join("\n");

  const prompt = `You are a routing function for a finance dashboard. Given a user's question, pick the single best-matching report from this list, or null if none genuinely fit.

Reports:
${catalog}

User question: "${question.replace(/"/g, "'")}"

Respond with ONLY a JSON object, no other text: {"id": "<report id or null>", "confidence": <0.0 to 1.0>}`;

  const result = await ollamaGenerateJson<{ id: string | null; confidence: number }>(prompt, 20000);
  const valid = result.id && VERIFIED_QUERIES.some((q) => q.id === result.id);
  return { id: valid ? result.id : null, confidence: typeof result.confidence === "number" ? result.confidence : 0.5 };
}

export async function llmSummarize(question: string, rows: Record<string, any>[]): Promise<string> {
  const sample = rows.slice(0, 12);
  const prompt = `You are a finance analyst. In 1-2 short sentences, answer the question using only the data given — do not invent numbers not present here.

Question: "${question.replace(/"/g, "'")}"
Data (JSON rows): ${JSON.stringify(sample)}

Answer in plain English, no markdown, no preamble like "Based on the data":`;

  const text = await ollamaGenerate(prompt, { timeoutMs: 20000 });
  return text.trim();
}
