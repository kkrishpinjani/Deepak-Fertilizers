// Ported from v17's backend/decision/confidence.ts, unchanged — pure
// weighted-average calculation, no external dependency.

export function calibrateConfidence(x: {
  planConfidence: number;
  evidenceScore: number;
  reconciliationScore: number;
  policyScore: number;
}) {
  const weighted = 0.25 * x.planConfidence + 0.3 * x.evidenceScore + 0.3 * x.reconciliationScore + 0.15 * x.policyScore;
  const level = weighted >= 0.9 ? "HIGH" : weighted >= 0.75 ? "MEDIUM" : "LOW";
  return {
    score: Number(weighted.toFixed(3)),
    level,
    components: x,
    thresholds: { autoAnalyze: 0.65, recommend: 0.75, actionProposal: 0.9 },
  };
}
