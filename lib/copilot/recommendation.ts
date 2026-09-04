// Ported from v17's backend/recommendations/recommendationEngine.ts,
// adapted to the {dimension, actual, plan, variance} row shape our
// real ranked-driver queries (e.g. conformed.cfo_root_cause) return.

export type DriverRow = { dimension: string; variance: number; actual?: number; plan?: number };

export function buildRecommendation(x: {
  kpiName: string;
  actual: number;
  plan: number;
  rows: DriverRow[];
}) {
  const variance = x.actual - x.plan;
  const negative = variance < 0;
  const topDriver = [...x.rows].sort((a, b) => a.variance - b.variance)[0];

  const action = negative
    ? {
        type: "REVIEW_DRIVER" as const,
        target: topDriver?.dimension || "Top negative variance",
        reason: `${x.kpiName} is below plan by ${Math.abs(variance).toLocaleString(undefined, { maximumFractionDigits: 0 })}.`,
      }
    : null;

  return {
    headline: negative ? `Investigate ${topDriver?.dimension || "the largest negative driver"}` : "Performance is at or above plan",
    rationale: negative
      ? `The largest negative driver is ${topDriver?.dimension ?? "unresolved"} at ${topDriver?.variance?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? "n/a"}. Prioritize validating this driver before adjusting the forecast.`
      : "No corrective action is indicated by the current variance breakdown.",
    priority: negative ? ("HIGH" as const) : ("LOW" as const),
    action,
  };
}
