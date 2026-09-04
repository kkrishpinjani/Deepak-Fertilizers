"use client";

import { Card, CardContent, Typography, Stack, Box, useTheme } from "@mui/material";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import TrendingFlatRoundedIcon from "@mui/icons-material/TrendingFlatRounded";
import type SvgIcon from "@mui/material/SvgIcon";

type SvgIconComponent = typeof SvgIcon;

export default function KpiCard({
  label,
  value,
  sub,
  positive,
  icon: Icon,
  percent,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean | null;
  icon?: SvgIconComponent;
  /** 0-100+, renders a mini progress bar (e.g. attainment %) */
  percent?: number;
}) {
  const theme = useTheme();
  const accent =
    positive === null || positive === undefined
      ? theme.palette.text.secondary
      : positive
      ? theme.palette.success.main
      : theme.palette.error.main;

  const TrendIcon =
    positive === null || positive === undefined
      ? TrendingFlatRoundedIcon
      : positive
      ? TrendingUpRoundedIcon
      : TrendingDownRoundedIcon;

  return (
    <Card
      variant="outlined"
      sx={{
        minHeight: 132,
        position: "relative",
        overflow: "hidden",
        borderColor: "divider",
      }}
    >
      <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, bgcolor: accent, opacity: 0.85 }} />
      <CardContent>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            {label}
          </Typography>
          {Icon && (
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: (t) =>
                  t.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(22,87,192,0.08)",
                color: "primary.main",
              }}
            >
              <Icon fontSize="small" />
            </Box>
          )}
        </Stack>

        <Typography variant="h4" sx={{ mt: 0.5, fontSize: 26 }}>
          {value}
        </Typography>

        {sub && (
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
            {positive !== undefined && <TrendIcon sx={{ fontSize: 16, color: accent }} />}
            <Typography variant="body2" sx={{ color: accent, fontWeight: 600 }}>
              {sub}
            </Typography>
          </Stack>
        )}

        {typeof percent === "number" && (
          <Box sx={{ mt: 1.5, height: 6, borderRadius: 3, bgcolor: "action.hover", overflow: "hidden" }}>
            <Box
              sx={{
                height: "100%",
                width: `${Math.max(0, Math.min(100, percent))}%`,
                bgcolor: accent,
                borderRadius: 3,
                transition: "width 0.4s ease",
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
