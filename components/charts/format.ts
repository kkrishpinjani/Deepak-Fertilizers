// Plain-string "unit" instead of a formatter function, so chart props stay
// serializable when passed from a server component page into these client
// chart components (functions can't cross that boundary).

export type ChartUnit = "inr-millions" | "count" | "headcount" | "raw";

export function formatChartValue(n: number, unit: ChartUnit = "raw"): string {
  switch (unit) {
    case "inr-millions":
      return `₹${(n / 1_000_000).toFixed(2)}M`;
    case "headcount":
      return `${n.toFixed(0)} people`;
    case "count":
      return `${n.toFixed(0)}`;
    default:
      return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }
}
