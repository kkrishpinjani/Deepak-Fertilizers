"use client";

import { useState } from "react";
import { Box, Stack, Typography, useTheme } from "@mui/material";
import { ChartUnit, formatChartValue } from "./format";

type Row = { label: string; value: number };

export default function DivergingBarChart({
  data,
  height,
  unit = "raw",
  maxRows = 8,
  /** For cost/spend metrics: positive variance (over plan) is bad, negative (under plan) is good. */
  invert = false,
  positiveLabel = "Ahead of plan",
  negativeLabel = "Behind plan",
}: {
  data: Row[];
  height?: number;
  unit?: ChartUnit;
  maxRows?: number;
  invert?: boolean;
  positiveLabel?: string;
  negativeLabel?: string;
}) {
  const valueFormatter = (n: number) => formatChartValue(n, unit);
  const theme = useTheme();
  const [hover, setHover] = useState<{ label: string; value: string } | null>(null);

  const rows = data.slice(0, maxRows);
  const rowH = 28;
  const chartHeight = height ?? rows.length * rowH + 16;
  const width = 640;
  const labelW = 210;
  const marginRight = 56;
  const plotW = width - labelW - marginRight;

  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  const zeroX = labelW + plotW / 2;
  const scale = plotW / 2 / maxAbs;

  const good = theme.palette.success.main;
  const bad = theme.palette.error.main;
  const mutedColor = theme.palette.text.secondary;
  const gridColor = theme.palette.divider;

  return (
    <Box sx={{ position: "relative" }}>
      <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: invert ? bad : good }} />
          <Typography variant="caption" color="text.secondary">
            {positiveLabel}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: invert ? good : bad }} />
          <Typography variant="caption" color="text.secondary">
            {negativeLabel}
          </Typography>
        </Stack>
      </Stack>

      <Box component="svg" viewBox={`0 0 ${width} ${chartHeight}`} sx={{ width: "100%", height: "auto", overflow: "visible" }}>
        <line x1={zeroX} x2={zeroX} y1={4} y2={chartHeight - 4} stroke={gridColor} strokeWidth={1} />

        {rows.map((r, i) => {
          const y = i * rowH + 8;
          const barW = Math.abs(r.value) * scale;
          const positive = r.value >= 0;
          const x = positive ? zeroX : zeroX - barW;
          const color = positive ? (invert ? bad : good) : invert ? good : bad;
          const labelX = positive ? x + barW + 8 : x - 8;

          return (
            <g key={r.label}>
              <text x={labelW - 12} y={y + rowH / 2 - 8} textAnchor="end" dominantBaseline="middle" fontSize={12} fill={theme.palette.text.primary}>
                {truncate(r.label, 28)}
              </text>
              <rect
                x={x}
                y={y}
                width={Math.max(1, barW)}
                height={16}
                rx={4}
                fill={color}
                onMouseEnter={() => setHover({ label: r.label, value: valueFormatter(r.value) })}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer" }}
              />
              <text
                x={labelX}
                y={y + 8}
                textAnchor={positive ? "start" : "end"}
                dominantBaseline="middle"
                fontSize={11}
                fill={mutedColor}
              >
                {valueFormatter(r.value)}
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
