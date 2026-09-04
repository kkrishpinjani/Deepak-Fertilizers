"use client";

import { useState } from "react";
import { Box, Typography, useTheme } from "@mui/material";

type Point = { x: string; y: number };

export default function LineChart({
  data,
  height = 220,
  warnThreshold,
  alarmThreshold,
  unit = "",
}: {
  data: Point[];
  height?: number;
  warnThreshold?: number;
  alarmThreshold?: number;
  unit?: string;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [hover, setHover] = useState<number | null>(null);

  const width = 640;
  const marginTop = 16;
  const marginBottom = 32;
  const marginLeft = 48;
  const marginRight = 16;
  const plotW = width - marginLeft - marginRight;
  const plotH = height - marginTop - marginBottom;

  const values = data.map((d) => d.y);
  const maxV = Math.max(...values, alarmThreshold || 0) * 1.05;
  const minV = Math.min(0, Math.min(...values));

  function yFor(v: number) {
    return marginTop + plotH - ((v - minV) / (maxV - minV || 1)) * plotH;
  }
  function xFor(i: number) {
    return marginLeft + (i / Math.max(data.length - 1, 1)) * plotW;
  }

  const path = data.map((d, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(d.y)}`).join(" ");
  const gridColor = theme.palette.divider;

  return (
    <Box sx={{ position: "relative" }}>
      <Box component="svg" viewBox={`0 0 ${width} ${height}`} sx={{ width: "100%", height: "auto", overflow: "visible" }}>
        {isDark && (
          <defs>
            <filter id="lineChartGlow" x="-20%" y="-60%" width="140%" height="220%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor={theme.palette.primary.main} floodOpacity={0.65} />
            </filter>
          </defs>
        )}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const v = minV + f * (maxV - minV);
          return (
            <g key={f}>
              <line x1={marginLeft} x2={width - marginRight} y1={yFor(v)} y2={yFor(v)} stroke={gridColor} strokeWidth={1} />
              <text x={marginLeft - 8} y={yFor(v)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill={theme.palette.text.secondary}>
                {v.toFixed(0)}
              </text>
            </g>
          );
        })}

        {typeof warnThreshold === "number" && (
          <line x1={marginLeft} x2={width - marginRight} y1={yFor(warnThreshold)} y2={yFor(warnThreshold)} stroke={theme.palette.warning.main} strokeDasharray="4 3" strokeWidth={1.5} />
        )}
        {typeof alarmThreshold === "number" && (
          <line x1={marginLeft} x2={width - marginRight} y1={yFor(alarmThreshold)} y2={yFor(alarmThreshold)} stroke={theme.palette.error.main} strokeDasharray="4 3" strokeWidth={1.5} />
        )}

        <path
          d={path}
          fill="none"
          stroke={theme.palette.primary.main}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          filter={isDark ? "url(#lineChartGlow)" : undefined}
        />

        {data.map((d, i) => (
          <circle
            key={i}
            cx={xFor(i)}
            cy={yFor(d.y)}
            r={hover === i ? 4 : 2.5}
            fill={theme.palette.background.paper}
            stroke={
              typeof alarmThreshold === "number" && d.y >= alarmThreshold
                ? theme.palette.error.main
                : typeof warnThreshold === "number" && d.y >= warnThreshold
                ? theme.palette.warning.main
                : theme.palette.primary.main
            }
            strokeWidth={2}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: "pointer" }}
          />
        ))}
      </Box>

      {hover !== null && (
        <Box
          sx={{
            position: "absolute",
            left: `${(xFor(hover) / width) * 100}%`,
            top: `${(yFor(data[hover].y) / height) * 100}%`,
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
          }}
        >
          <Typography variant="caption" display="block" color="text.secondary">
            {data[hover].x}
          </Typography>
          <Typography variant="body2" fontWeight={700}>
            {data[hover].y.toFixed(2)} {unit}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
