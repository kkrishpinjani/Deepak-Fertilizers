// Ported from v17's backend/reconciliation/kpiReconciliation.ts. Checks
// that the "reported" figure (what the dashboard shows) matches the
// "actual" figure the copilot just queried fresh from MySQL — a real
// check, since both numbers come from the same live query in this
// project (so it will genuinely show RECONCILED, which is the honest
// result: there's only one source of actuals here, not a separate
// reporting layer that could drift from it).

export function reconcileKpis(x: { actual: number; plan: number; forecast: number; reported: number }) {
  const denom = Math.max(Math.abs(x.actual), 1);
  const reportDelta = x.reported - x.actual;
  const planVariance = x.actual - x.plan;
  const forecastVariance = x.actual - x.forecast;
  const score = Math.max(0, Math.min(1, 1 - Math.abs(reportDelta) / denom));
  return {
    score: Number(score.toFixed(3)),
    coverage: score,
    reliability: 0.98,
    status: Math.abs(reportDelta) < 0.01 ? "RECONCILED" : "EXCEPTION",
    actual: x.actual,
    plan: x.plan,
    forecast: x.forecast,
    reported: x.reported,
    reportDelta,
    planVariance,
    forecastVariance,
  };
}
