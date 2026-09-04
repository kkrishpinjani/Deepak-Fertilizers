"use client";

import { useState } from "react";
import { Box, Stack, Typography, useTheme } from "@mui/material";
import { ChartUnit, formatChartValue } from "./format";

type Row = { label: string; value: number };

export default function DonutChart({ data, unit = "raw", size = 220 }: { data: Row[]; unit?: ChartUnit; size?: number }) {
  const theme = useTheme();
  const palette = [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.warning.main, theme.palette.error.main, theme.palette.success.main];
  const [hover, setHover] = useState<number | null>(null);

  const total = data.reduce((s, d) => s + Math.abs(d.value), 0) || 1;
  const r = size / 2;
  const stroke = r * 0.35;
  const radius = r - stroke / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const segments = data.map((d, i) => {
    const fraction = Math.abs(d.value) / total;
    const seg = { ...d, color: palette[i % palette.length], fraction, offset };
    offset += fraction;
    return seg;
  });

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems="center">
      <Box sx={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {segments.map((s, i) => (
            <circle
              key={s.label}
              cx={r}
              cy={r}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${s.fraction * circumference} ${circumference}`}
              strokeDashoffset={-s.offset * circumference}
              opacity={hover === null || hover === i ? 1 : 0.35}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer", transition: "opacity 0.15s" }}
              transform={`rotate(-90 ${r} ${r})`}
            />
          ))}
        </svg>
        {hover !== null && (
          <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", textAlign: "center", px: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {segments[hover].label}
            </Typography>
            <Typography variant="body2" fontWeight={700}>
              {formatChartValue(segments[hover].value, unit)}
            </Typography>
          </Box>
        )}
      </Box>
      <Stack spacing={0.75}>
        {segments.map((s, i) => (
          <Stack key={s.label} direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: s.color }} />
            <Typography variant="body2">{s.label}</Typography>
            <Typography variant="body2" color="text.secondary">
              {formatChartValue(s.value, unit)}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
