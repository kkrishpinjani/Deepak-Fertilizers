"use client";

import { useState } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { ChartUnit, formatChartValue } from "./format";

type Row = { label: string; value: number };

// A real bridge chart: start -> sequential deltas -> end, each bar's
// baseline resting on the running total so far (not all bars starting
// at zero like a bar chart) — the actual shape a CFO expects for
// "what moved EBITDA from plan to actual."
export default function WaterfallChart({
  startLabel,
  startValue,
  steps,
  endLabel,
  height = 260,
  unit = "raw",
}: {
  startLabel: string;
  startValue: number;
  steps: Row[];
  endLabel: string;
  height?: number;
  unit?: ChartUnit;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [hover, setHover] = useState<{ label: string; value: string } | null>(null);
  const valueFormatter = (n: number) => formatChartValue(n, unit);

  const endValue = startValue + steps.reduce((s, r) => s + r.value, 0);
  const bars = [
    { label: startLabel, value: startValue, kind: "total" as const },
    ...steps.map((s) => ({ ...s, kind: "delta" as const })),
    { label: endLabel, value: endValue, kind: "total" as const },
  ];

  // Running baseline for each bar.
  let running = 0;
  const positioned = bars.map((b) => {
    if (b.kind === "total") {
      const bottom = 0;
      const top = b.value;
      running = b.value;
      return { ...b, from: bottom, to: top };
    }
    const from = running;
    const to = running + b.value;
    running = to;
    return { ...b, from, to };
  });

  const allValues = positioned.flatMap((b) => [b.from, b.to]);
  const maxV = Math.max(0, ...allValues);
  const minV = Math.min(0, ...allValues);
  const range = Math.max(1, maxV - minV);

  const width = 640;
  const marginTop = 12;
  const marginBottom = 32;
  const plotH = height - marginTop - marginBottom;
  const barGap = 10;
  const barW = (width - barGap * (positioned.length + 1)) / positioned.length;

  const yFor = (v: number) => marginTop + plotH - ((v - minV) / range) * plotH;
  const zeroY = yFor(0);

  const good = theme.palette.success.main;
  const bad = theme.palette.error.main;
  const neutral = theme.palette.text.secondary;
  const totalColor = theme.palette.primary.main;
  const gridColor = theme.palette.divider;

  return (
    <Box sx={{ position: "relative" }}>
      <Box component="svg" viewBox={`0 0 ${width} ${height}`} sx={{ width: "100%", height: "auto", overflow: "visible" }}>
        {isDark && (
          <defs>
            <filter id="waterfallStepGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="0" stdDeviation="1.4" floodColor={theme.palette.primary.main} floodOpacity={0.55} />
            </filter>
            <linearGradient id="waterfallTotalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={totalColor} stopOpacity={1} />
              <stop offset="100%" stopColor={totalColor} stopOpacity={0.72} />
            </linearGradient>
          </defs>
        )}
        <line x1={0} x2={width} y1={zeroY} y2={zeroY} stroke={gridColor} strokeWidth={1} />
        {positioned.map((b, i) => {
          const x = barGap + i * (barW + barGap);
          const top = yFor(Math.max(b.from, b.to));
          const bottom = yFor(Math.min(b.from, b.to));
          const h = Math.max(1, bottom - top);
          const color = b.kind === "total" ? totalColor : b.value >= 0 ? good : bad;

          return (
            <g key={`${b.label}-${i}`}>
              <rect
                x={x}
                y={top}
                width={barW}
                height={h}
                rx={3}
                fill={b.kind === "total" && isDark ? "url(#waterfallTotalGrad)" : color}
                fillOpacity={isDark && b.kind !== "total" ? 0.9 : 1}
                onMouseEnter={() => setHover({ label: b.label, value: valueFormatter(b.kind === "total" ? b.value : b.value) })}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer" }}
              />
              {i < positioned.length - 1 && (
                <line
                  x1={x + barW}
                  x2={x + barW + barGap}
                  y1={yFor(b.to)}
                  y2={yFor(b.to)}
                  stroke={isDark ? theme.palette.primary.main : gridColor}
                  strokeDasharray="2,2"
                  strokeOpacity={isDark ? 0.8 : 1}
                  filter={isDark ? "url(#waterfallStepGlow)" : undefined}
                />
              )}
              <text x={x + barW / 2} y={height - marginBottom + 14} textAnchor="middle" fontSize={10} fill={neutral}>
                {truncate(b.label, 12)}
              </text>
            </g>
          );
        })}
      </Box>

      {hover && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            px: 1,
            py: 0.5,
            boxShadow: 3,
            pointerEvents: "none",
          }}
        >
          <Typography variant="caption" display="block" color="text.secondary">
            {hover.label}
          </Typography>
          <Typography variant="body2" fontWeight={700}>
            {hover.value}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
