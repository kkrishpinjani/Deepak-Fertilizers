"use client";

import { useState } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { ChartUnit, formatChartValue } from "./format";

type Row = { label: string; x: number; y: number; size: number };

// Actual (y) vs Plan (x) bubble chart, bubble radius scaled by |variance|
// — reuses the same {actual, plan, variance} fields every driver row
// already carries, so this is a real alternate view of the same data,
// not a chart type that needs its own bespoke query.
export default function ScatterChart({
  data,
  height = 320,
  unit = "raw",
}: {
  data: Row[];
  height?: number;
  unit?: ChartUnit;
}) {
  const theme = useTheme();
  const [hover, setHover] = useState<{ label: string; x: string; y: string } | null>(null);
  const valueFormatter = (n: number) => formatChartValue(n, unit);

  const width = 640;
  const margin = 44;
  const plotW = width - margin * 2;
  const plotH = height - margin * 2;

  const allX = data.map((d) => d.x);
  const allY = data.map((d) => d.y);
  const maxX = Math.max(1, ...allX, ...allY);
  const minX = Math.min(0, ...allX, ...allY);
  const range = Math.max(1, maxX - minX);
  const maxSize = Math.max(1, ...data.map((d) => Math.abs(d.size)));

  const px = (v: number) => margin + ((v - minX) / range) * plotW;
  const py = (v: number) => height - margin - ((v - minX) / range) * plotH;

  const gridColor = theme.palette.divider;
  const diagColor = theme.palette.text.secondary;

  return (
    <Box sx={{ position: "relative" }}>
      <Box component="svg" viewBox={`0 0 ${width} ${height}`} sx={{ width: "100%", height: "auto", overflow: "visible" }}>
        <line x1={margin} x2={width - margin} y1={height - margin} y2={height - margin} stroke={gridColor} />
        <line x1={margin} x2={margin} y1={margin} y2={height - margin} stroke={gridColor} />
        {/* y = x reference line: on-plan performance */}
        <line x1={px(minX)} x2={px(maxX)} y1={py(minX)} y2={py(maxX)} stroke={diagColor} strokeDasharray="3,3" opacity={0.5} />
        <text x={width - margin} y={height - margin + 16} textAnchor="end" fontSize={10} fill={diagColor}>
          Plan →
        </text>
        <text x={margin - 8} y={margin - 6} textAnchor="start" fontSize={10} fill={diagColor}>
          ↑ Actual
        </text>

        {data.map((d, i) => {
          const r = 4 + (Math.abs(d.size) / maxSize) * 14;
          const color = d.y >= d.x ? theme.palette.success.main : theme.palette.error.main;
          return (
            <circle
              key={`${d.label}-${i}`}
              cx={px(d.x)}
              cy={py(d.y)}
              r={r}
              fill={color}
              fillOpacity={0.65}
              stroke={color}
              onMouseEnter={() => setHover({ label: d.label, x: valueFormatter(d.x), y: valueFormatter(d.y) })}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}
            />
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
          <Typography variant="body2">Actual: {hover.y}</Typography>
          <Typography variant="body2">Plan: {hover.x}</Typography>
        </Box>
      )}
    </Box>
  );
}
