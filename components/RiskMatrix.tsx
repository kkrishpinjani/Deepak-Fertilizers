"use client";

import { useState } from "react";
import { Card, CardContent, Typography, Box, Stack, Divider, Grid, useTheme } from "@mui/material";
import StatusBadge, { type Tone } from "./StatusBadge";

export type RiskItem = {
  id: string;
  name: string;
  probability: "Low" | "Medium" | "High";
  impact: "Low" | "Medium" | "High";
  description: string;
  financialImpact: string;
  rootCause: string;
  trend: string;
  mitigation: string;
  owner: string;
  action: string;
  tone: Tone;
};

const PROB_ORDER = ["High", "Medium", "Low"] as const;
const IMPACT_ORDER = ["Low", "Medium", "High"] as const;

function cellShade(pr: string, im: string, isDark: boolean) {
  const score = (pr === "High" ? 2 : pr === "Medium" ? 1 : 0) + (im === "High" ? 2 : im === "Medium" ? 1 : 0);
  if (score >= 3) return isDark ? "rgba(248,113,113,0.09)" : "rgba(194,42,42,0.07)";
  if (score >= 2) return isDark ? "rgba(251,191,36,0.08)" : "rgba(161,92,0,0.06)";
  return "transparent";
}

export default function RiskMatrix({ items }: { items: RiskItem[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const selected = items.find((it) => it.id === selectedId) || null;
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const cells: React.ReactNode[] = [<Box key="corner" />];
  IMPACT_ORDER.forEach((im) =>
    cells.push(
      <Typography key={`h-${im}`} variant="caption" align="center" color="text.secondary" sx={{ fontWeight: 650 }}>
        {im} impact
      </Typography>
    )
  );
  PROB_ORDER.forEach((pr) => {
    cells.push(
      <Typography key={`r-${pr}`} variant="caption" color="text.secondary" sx={{ fontWeight: 650, alignSelf: "center" }}>
        {pr} probability
      </Typography>
    );
    IMPACT_ORDER.forEach((im) => {
      const cellItems = items.filter((it) => it.probability === pr && it.impact === im);
      cells.push(
        <Box
          key={`${pr}-${im}`}
          sx={{
            minHeight: 60,
            border: "1px solid",
            borderColor: isDark ? "rgba(148,163,220,0.14)" : "divider",
            borderStyle: "dashed",
            borderRadius: 1.5,
            p: 0.75,
            bgcolor: cellShade(pr, im, isDark),
            backgroundImage: isDark
              ? "linear-gradient(rgba(148,163,220,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,220,0.05) 1px, transparent 1px)"
              : "none",
            backgroundSize: "10px 10px",
            transition: "background-color 160ms ease",
          }}
        >
          <Stack spacing={0.5}>
            {cellItems.map((it) => (
              <Box
                key={it.id}
                onClick={() => setSelectedId(it.id)}
                sx={{
                  cursor: "pointer",
                  px: 0.85,
                  py: 0.45,
                  borderRadius: 1,
                  bgcolor: "background.paper",
                  border: "1.5px solid",
                  borderColor: selectedId === it.id ? "primary.main" : "divider",
                  fontSize: 12,
                  fontWeight: 650,
                  transition: "border-color 0.15s, box-shadow 0.15s",
                  boxShadow: isDark && selectedId === it.id ? "0 0 0 1px rgba(90,169,255,0.3), 0 0 16px rgba(90,169,255,0.2)" : "none",
                  "&:hover": { borderColor: "primary.main" },
                }}
              >
                {it.name}
              </Box>
            ))}
          </Stack>
        </Box>
      );
    });
  });

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" sx={{ fontSize: 16, mb: 0.25 }}>
            Risk matrix
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Probability of missing plan, by financial impact if it happens. Click a risk to see the full detail.
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "110px repeat(3, 1fr)", gap: 0.75, overflowX: "auto" }}>{cells}</Box>
        </CardContent>
      </Card>

      {selected && (
        <Card
          variant="outlined"
          sx={{
            borderLeft: "3px solid",
            borderLeftColor: `${{ critical: "error", watch: "warning", positive: "success", info: "info", neutral: "text" }[selected.tone]}.main`,
          }}
        >
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }} flexWrap="wrap" rowGap={1}>
              <Typography variant="h6" sx={{ fontSize: 16 }}>
                {selected.name}
              </Typography>
              <StatusBadge tone={selected.tone} label={`${selected.probability} probability · ${selected.impact} impact`} pill />
            </Stack>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {selected.description}
            </Typography>
            <Grid container spacing={2}>
              {[
                ["Financial impact", selected.financialImpact],
                ["Root cause", selected.rootCause],
                ["Trend", selected.trend],
                ["Owner", selected.owner],
              ].map(([label, value]) => (
                <Grid item xs={12} sm={6} key={label}>
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>
                    {label}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.25 }}>
                    {value}
                  </Typography>
                </Grid>
              ))}
            </Grid>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>
              Mitigation &amp; recommended action
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.25 }}>
              {selected.mitigation} {selected.action}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
