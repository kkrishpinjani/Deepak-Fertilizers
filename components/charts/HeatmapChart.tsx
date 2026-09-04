"use client";

import { useState } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { ChartUnit, formatChartValue } from "./format";

export type HeatmapCell = { row: string; col: string; value: number };

// A real plant x product (or any two-dimension) variance grid — used
// where a single ranked list would hide which combination of two
// dimensions is driving the number, e.g. "which plant/product pairs
// are behind plan."
export default function HeatmapChart({
  cells,
  height,
  unit = "raw",
}: {
  cells: HeatmapCell[];
  height?: number;
  unit?: ChartUnit;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [hover, setHover] = useState<{ row: string; col: string; value: string } | null>(null);
  const valueFormatter = (n: number) => formatChartValue(n, unit);

  const rows = Array.from(new Set(cells.map((c) => c.row)));
  const cols = Array.from(new Set(cells.map((c) => c.col)));
  const cellMap = new Map(cells.map((c) => [`${c.row}::${c.col}`, c.value]));

  const maxAbs = Math.max(1, ...cells.map((c) => Math.abs(c.value)));
  const cellH = 32;
  const rowLabelW = 168;
  const width = 640;
  const colW = (width - rowLabelW) / Math.max(1, cols.length);
  const chartHeight = height ?? rows.length * cellH + 24;

  const good = theme.palette.success.main;
  const bad = theme.palette.error.main;

  function colorFor(v: number | undefined) {
    if (v === undefined) return theme.palette.action.hover;
    const t = Math.min(1, Math.abs(v) / maxAbs);
    const base = v >= 0 ? good : bad;
    return alpha(base, 0.15 + t * 0.75);
  }

  function alpha(hex: string, a: number) {
    return hex.startsWith("#") ? hex + Math.round(a * 255).toString(16).padStart(2, "0") : hex;
  }

  return (
    <Box sx={{ position: "relative" }}>
      <Box component="svg" viewBox={`0 0 ${width} ${chartHeight}`} sx={{ width: "100%", height: "auto", overflow: "visible" }}>
        {cols.map((col, ci) => (
          <text
            key={col}
            x={rowLabelW + ci * colW + colW / 2}
            y={12}
            textAnchor="middle"
            fontSize={10}
            fill={theme.palette.text.secondary}
          >
            {truncate(col, 14)}
          </text>
        ))}
        {rows.map((row, ri) => {
          const y = 20 + ri * cellH;
          return (
            <g key={row}>
              <text x={rowLabelW - 10} y={y + cellH / 2} textAnchor="end" dominantBaseline="middle" fontSize={12} fill={theme.palette.text.primary}>
                {truncate(row, 20)}
              </text>
              {cols.map((col, ci) => {
                const v = cellMap.get(`${row}::${col}`);
                return (
                  <rect
                    key={col}
                    x={rowLabelW + ci * colW + 2}
                    y={y}
                    width={colW - 4}
                    height={cellH - 4}
                    rx={4}
                    fill={colorFor(v)}
                    stroke={isDark ? "rgba(148,163,220,0.14)" : "none"}
                    strokeWidth={isDark ? 1 : 0}
                    onMouseEnter={() => v !== undefined && setHover({ row, col, value: valueFormatter(v) })}
                    onMouseLeave={() => setHover(null)}
                    style={{ cursor: v !== undefined ? "pointer" : "default" }}
                  />
                );
              })}
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
            {hover.row} × {hover.col}
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
