// Ported from v17's backend/visualization/chartSelector.ts. Picks a
// chart type from the question's own language, not a hardcoded
// per-query mapping — the same question phrased two ways can select
// different charts.

export type ChartChoice = {
  type: "bar-diverging" | "bar-grouped" | "donut" | "waterfall" | "heatmap" | "scatter";
  reason: string;
};

export function selectVisualization(question: string, hasActualPlanSeries: boolean): ChartChoice {
  const q = question.toLowerCase();
  if (/waterfall|bridge/.test(q)) return { type: "waterfall", reason: "bridge/waterfall language" };
  if (/heatmap|matrix|grid|by plant and product|plant.*product.*variance/.test(q))
    return { type: "heatmap", reason: "two-dimension grid language" };
  if (/scatter|bubble|correlation|actual vs plan/.test(q)) return { type: "scatter", reason: "actual-vs-plan comparison language" };
  if (/mix|share|composition/.test(q)) return { type: "donut", reason: "mix/composition language" };
  if (/driver|why|variance|root cause/.test(q))
    return { type: "bar-diverging", reason: "driver/variance language" };
  if (hasActualPlanSeries) return { type: "bar-grouped", reason: "actual vs plan comparison" };
  return { type: "bar-diverging", reason: "default ranked-value view" };
}
