"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, Typography, Grid, Chip, Stack, Box } from "@mui/material";

type OutlookRow = {
  plant_name: string;
  ytd_actual_revenue: number;
  ytd_budget_revenue: number;
  ytd_variance: number;
  ytd_attainment_percent: number;
  risk_status: "AT RISK" | "WATCH" | "ON TRACK" | "UNKNOWN";
};

const STATUS_COLOR: Record<string, "error" | "warning" | "success" | "default"> = {
  "AT RISK": "error",
  WATCH: "warning",
  "ON TRACK": "success",
  UNKNOWN: "default",
};

const STATUS_LABEL: Record<string, string> = {
  "AT RISK": "At risk",
  WATCH: "Watch closely",
  "ON TRACK": "On track",
  UNKNOWN: "Unknown",
};

export default function OutlookRisk() {
  const [rows, setRows] = useState<OutlookRow[] | null>(null);

  useEffect(() => {
    fetch("/api/query?id=full_year_outlook_risk")
      .then((r) => r.json())
      .then((d) => setRows(d.rows || []));
  }, []);

  return (
    <Card variant="outlined">
      <CardContent>
        <Grid container spacing={2}>
          {(rows || []).map((r) => {
            const color = STATUS_COLOR[r.risk_status] || "default";
            const attainment = Number(r.ytd_attainment_percent);
            return (
              <Grid item xs={12} sm={6} key={r.plant_name}>
                <Stack
                  spacing={1.25}
                  sx={{
                    p: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    borderLeft: "4px solid",
                    borderLeftColor: `${color}.main`,
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1">{r.plant_name}</Typography>
                    <Chip size="small" label={STATUS_LABEL[r.risk_status] || r.risk_status} color={color} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Actual ₹{(Number(r.ytd_actual_revenue) / 1_000_000).toFixed(2)}M vs plan ₹
                    {(Number(r.ytd_budget_revenue) / 1_000_000).toFixed(2)}M ({attainment.toFixed(1)}%)
                  </Typography>
                  <Box sx={{ height: 6, borderRadius: 3, bgcolor: "action.hover", overflow: "hidden" }}>
                    <Box
                      sx={{
                        height: "100%",
                        width: `${Math.max(0, Math.min(100, attainment))}%`,
                        bgcolor: `${color}.main`,
                        borderRadius: 3,
                      }}
                    />
                  </Box>
                </Stack>
              </Grid>
            );
          })}
        </Grid>
      </CardContent>
    </Card>
  );
}
