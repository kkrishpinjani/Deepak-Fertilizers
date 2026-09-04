"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, Typography, Stack, Box, CircularProgress } from "@mui/material";
import StatusBadge, { type Tone } from "./StatusBadge";
import RiskMatrix, { type RiskItem } from "./RiskMatrix";

type OutlookRow = {
  plant_name: string;
  ytd_actual_revenue: number;
  ytd_budget_revenue: number;
  ytd_variance: number;
  ytd_attainment_percent: number;
  risk_status: "AT RISK" | "WATCH" | "ON TRACK" | "UNKNOWN";
};

const STATUS_TONE: Record<string, Tone> = { "AT RISK": "critical", WATCH: "watch", "ON TRACK": "positive", UNKNOWN: "neutral" };
const STATUS_LABEL: Record<string, string> = { "AT RISK": "At risk", WATCH: "Watch closely", "ON TRACK": "On track", UNKNOWN: "Unknown" };

function fmt(n: number) {
  return `₹${(n / 1_000_000).toFixed(2)}M`;
}

export default function OutlookRisk() {
  const [rows, setRows] = useState<OutlookRow[] | null>(null);

  useEffect(() => {
    fetch("/api/query?id=full_year_outlook_risk")
      .then((r) => r.json())
      .then((d) => setRows(d.rows || []));
  }, []);

  if (!rows) {
    return (
      <Card variant="outlined">
        <CardContent>
          <CircularProgress size={20} />
        </CardContent>
      </Card>
    );
  }

  const budgets = rows.map((r) => Number(r.ytd_budget_revenue)).sort((a, b) => a - b);
  const impactBucket = (v: number): RiskItem["impact"] => {
    if (budgets.length < 3) return "Medium";
    const lo = budgets[Math.floor(budgets.length / 3)];
    const hi = budgets[Math.floor((budgets.length * 2) / 3)];
    if (v >= hi) return "High";
    if (v >= lo) return "Medium";
    return "Low";
  };
  const probabilityFor = (status: string): RiskItem["probability"] => (status === "AT RISK" ? "High" : status === "WATCH" ? "Medium" : "Low");

  const riskItems: RiskItem[] = rows.map((r) => {
    const attainment = Number(r.ytd_attainment_percent);
    const gap = 100 - attainment;
    return {
      id: r.plant_name,
      name: r.plant_name,
      probability: probabilityFor(r.risk_status),
      impact: impactBucket(Number(r.ytd_budget_revenue)),
      tone: STATUS_TONE[r.risk_status] || "neutral",
      description: `${r.plant_name} is tracking at ${attainment.toFixed(1)}% of its full-year revenue target — ${
        gap > 0 ? `${fmt(Math.abs(Number(r.ytd_variance)))} behind plan` : `${fmt(Math.abs(Number(r.ytd_variance)))} ahead of plan`
      } year to date.`,
      financialImpact: `${fmt(Math.abs(Number(r.ytd_variance)))} revenue ${gap > 0 ? "shortfall" : "surplus"} vs full-year target of ${fmt(Number(r.ytd_budget_revenue))}.`,
      rootCause: gap > 5 ? "Volume and pricing running behind the plan built into Anaplan for this location." : "Within normal variance of plan.",
      trend: gap > 0 ? "Behind plan and not yet recovering." : "Tracking at or ahead of plan.",
      mitigation: gap > 5 ? `Plant leadership to review pricing, volume commitments and cost pass-through for the remainder of the year.` : "Continue monitoring — no action required.",
      owner: `Plant General Manager, ${r.plant_name}`,
      action: gap > 5 ? "Escalate to the commercial team for a mid-year forecast revision." : "",
    };
  });

  return (
    <Stack spacing={3}>
      <RiskMatrix items={riskItems} />

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" sx={{ fontSize: 16, mb: 1.5 }}>
            All locations
          </Typography>
          <Stack spacing={1}>
            {rows.map((r) => {
              const attainment = Number(r.ytd_attainment_percent);
              return (
                <Box key={r.plant_name}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" fontWeight={650}>
                      {r.plant_name}
                    </Typography>
                    <StatusBadge tone={STATUS_TONE[r.risk_status] || "neutral"} label={STATUS_LABEL[r.risk_status] || r.risk_status} size="small" />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Actual {fmt(Number(r.ytd_actual_revenue))} vs plan {fmt(Number(r.ytd_budget_revenue))} ({attainment.toFixed(1)}%)
                  </Typography>
                  <Box sx={{ height: 6, borderRadius: 3, bgcolor: "action.hover", overflow: "hidden", mt: 0.5 }}>
                    <Box
                      sx={{
                        height: "100%",
                        width: `${Math.max(0, Math.min(100, attainment))}%`,
                        bgcolor: `${{ critical: "error", watch: "warning", positive: "success", info: "info", neutral: "text" }[STATUS_TONE[r.risk_status] || "neutral"]}.main`,
                        borderRadius: 3,
                      }}
                    />
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
