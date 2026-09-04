"use client";

import { useState } from "react";
import { Box, Stack, Typography, useTheme } from "@mui/material";
import { ChartUnit, formatChartValue } from "./format";

type SeriesDef = { key: string; label: string };

type Row = { category: string; [key: string]: number | string };

export default function GroupedBarChart({
  data,
  series,
  height = 260,
  unit = "raw",
}: {
  data: Row[];
  series: SeriesDef[];
  height?: number;
  unit?: ChartUnit;
}) {
  const valueFormatter = (n: number) => formatChartValue(n, unit);
  const theme = useTheme();
  // Fixed categorical order — never cycled/generated per series count.
  const palette = [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.warning.main];
  const colored = series.map((s, i) => ({ ...s, color: palette[i % palette.length] }));
  const [hover, setHover] = useState<{ x: number; y: number; label: string; value: string } | null>(null);

  const width = 640;
  const marginTop = 16;
  const marginBottom = 32;
  const marginLeft = 56;
  const marginRight = 16;
  const plotW = width - marginLeft - marginRight;
  const plotH = height - marginTop - marginBottom;

  const allValues = data.flatMap((d) => colored.map((s) => Number(d[s.key]) || 0));
  const maxValue = Math.max(1, ...allValues);
  const niceMax = niceCeil(maxValue);

  const groupCount = data.length;
  const groupW = plotW / groupCount;
  const barGap = 3;
  const barW = Math.min(24, (groupW - barGap * (colored.length + 1)) / colored.length);

  const yTicks = [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax];
  const gridColor = theme.palette.mode === "dark" ? "#2c2c2a" : "#e1e0d9";
  const mutedColor = theme.palette.text.secondary;

  function yFor(v: number) {
    return marginTop + plotH - (v / niceMax) * plotH;
  }

  return (
    <Box sx={{ position: "relative" }}>
      {colored.length >= 2 && (
        <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
          {colored.map((s) => (
            <Stack key={s.key} direction="row" spacing={0.75} alignItems="center">
              <Box sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: s.color }} />
              <Typography variant="caption" color="text.secondary">
                {s.label}
              </Typography>
            </Stack>
          ))}
        </Stack>
      )}

      <Box component="svg" viewBox={`0 0 ${width} ${height}`} sx={{ width: "100%", height: "auto", overflow: "visible" }}>
        {/* gridlines + y ticks */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={marginLeft}
              x2={width - marginRight}
              y1={yFor(t)}
              y2={yFor(t)}
              stroke={gridColor}
              strokeWidth={1}
            />
            <text x={marginLeft - 8} y={yFor(t)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill={mutedColor}>
              {t === 0 ? "0" : compact(t)}
            </text>
          </g>
        ))}

        {/* bars */}
        {data.map((d, gi) => {
          const groupX = marginLeft + gi * groupW;
          return (
            <g key={d.category}>
              {colored.map((s, si) => {
                const value = Number(d[s.key]) || 0;
                const barH = (value / niceMax) * plotH;
                const x = groupX + barGap + si * (barW + barGap);
                const y = yFor(value);
                return (
                  <rect
                    key={s.key}
                    x={x}
                    y={y}
                    width={barW}
                    height={Math.max(0, barH)}
                    rx={4}
                    fill={s.color}
                    onMouseEnter={() =>
                      setHover({ x: x + barW / 2, y, label: `${d.category} · ${s.label}`, value: valueFormatter(value) })
                    }
                    onMouseLeave={() => setHover(null)}
                    style={{ cursor: "pointer" }}
                  />
                );
              })}
              <text
                x={groupX + groupW / 2}
                y={height - marginBottom + 18}
                textAnchor="middle"
                fontSize={12}
                fill={mutedColor}
              >
                {d.category}
              </text>
            </g>
          );
        })}

        {/* baseline */}
        <line
          x1={marginLeft}
          x2={width - marginRight}
          y1={yFor(0)}
          y2={yFor(0)}
          stroke={theme.palette.mode === "dark" ? "#383835" : "#c3c2b7"}
          strokeWidth={1}
        />
      </Box>

      {hover && (
        <Box
          sx={{
            position: "absolute",
            left: `${(hover.x / width) * 100}%`,
            top: `${(hover.y / height) * 100}%`,
            transform: "translate(-50%, -130%)",
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            px: 1,
            py: 0.5,
            boxShadow: 3,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 1,
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

function niceCeil(v: number) {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const n = v / base;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * base;
}

function compact(v: number) {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(0);
}
