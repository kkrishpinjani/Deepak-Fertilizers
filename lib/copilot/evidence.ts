// Ported from v17's backend/evidence/evidenceScorer.ts. Scores each
// evidence item's relevance to the question by keyword overlap plus a
// base confidence — real evidence sources here are the actual MySQL
// query, the conformed model's foreign-key relationships, and the
// KPI reconciliation check, not simulated ones.

export type EvidenceItem = {
  type: "DATA" | "QUERY" | "ONTOLOGY" | "RECONCILIATION" | "DOCUMENT" | "AGENT";
  source: string;
  detail: string;
  confidence: number;
};

export function scoreEvidence(evidence: EvidenceItem[], question: string) {
  const q = question.toLowerCase();
  return evidence
    .map((e) => {
      const detail = e.detail.toLowerCase();
      const overlap = q.split(/\W+/).filter(Boolean).filter((w) => w.length > 3 && detail.includes(w)).length;
      const score = Math.min(0.99, e.confidence + Math.min(0.25, overlap * 0.03));
      return { ...e, relevance: Number(score.toFixed(2)) };
    })
    .sort((a, b) => b.relevance - a.relevance);
}

export function evidenceScoreAverage(scored: ReturnType<typeof scoreEvidence>) {
  if (!scored.length) return 0;
  return Number((scored.reduce((sum, e) => sum + e.relevance, 0) / scored.length).toFixed(3));
}
