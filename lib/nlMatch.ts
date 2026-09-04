// Lightweight natural-language matcher. There's no Snowflake Cortex
// Analyst or LLM API key available in this environment, so this
// approximates the "verified query" matching behavior Cortex Analyst
// itself falls back on: score the user's free-text question against
// each verified query's question + synonyms, and return the best match.
// This is deliberately NOT free-form NL-to-SQL generation.

import { VERIFIED_QUERIES, VerifiedQuery } from "./queries";

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "what", "which", "who",
  "how", "we", "our", "for", "of", "in", "on", "vs", "versus", "and",
  "did", "do", "does", "to", "by", "show", "me", "us", "i", "you", "it",
  "this", "that", "with", "against",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export type MatchResult = {
  query: VerifiedQuery | null;
  confidence: number; // 0..1
  alternates: { id: string; question: string; score: number }[];
};

export function matchQuestion(userQuestion: string): MatchResult {
  const userTokens = new Set(tokenize(userQuestion));

  const scored = VERIFIED_QUERIES.map((q) => {
    const corpus = tokenize([q.question, ...q.synonyms].join(" "));
    const corpusSet = new Set(corpus);
    let overlap = 0;
    for (const t of userTokens) if (corpusSet.has(t)) overlap++;
    const score = userTokens.size === 0 ? 0 : overlap / userTokens.size;
    return { id: q.id, question: q.question, score, query: q };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  const confidence = best ? best.score : 0;

  return {
    query: confidence >= 0.34 ? best.query : null,
    confidence,
    alternates: scored.slice(0, 4).map(({ id, question, score }) => ({ id, question, score })),
  };
}
