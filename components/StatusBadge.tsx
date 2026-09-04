"use client";

import { Stack, Typography, alpha, useTheme } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";

// A status is never color-only: every badge pairs a dot/icon with a plain
// word, per the "never communicate meaning through color alone" rule.
export type Tone = "positive" | "watch" | "critical" | "info" | "neutral";

const ICONS: Record<Tone, typeof CheckCircleRoundedIcon> = {
  positive: CheckCircleRoundedIcon,
  watch: WarningAmberRoundedIcon,
  critical: ErrorRoundedIcon,
  info: InfoRoundedIcon,
  neutral: RemoveRoundedIcon,
};

export function useToneColor(tone: Tone) {
  const theme = useTheme();
  switch (tone) {
    case "positive":
      return theme.palette.success.main;
    case "watch":
      return theme.palette.warning.main;
    case "critical":
      return theme.palette.error.main;
    case "info":
      return theme.palette.info.main;
    default:
      return theme.palette.text.secondary;
  }
}

export default function StatusBadge({
  tone,
  label,
  size = "medium",
  pill = false,
}: {
  tone: Tone;
  label: string;
  size?: "small" | "medium";
  pill?: boolean;
}) {
  const color = useToneColor(tone);
  const Icon = ICONS[tone];
  const dim = size === "small" ? 13 : 15;

  return (
    <Stack
      direction="row"
      spacing={0.55}
      alignItems="center"
      sx={
        pill
          ? {
              display: "inline-flex",
              bgcolor: alpha(color, 0.12),
              borderRadius: 999,
              px: 1,
              py: 0.35,
            }
          : { display: "inline-flex" }
      }
    >
      <Icon sx={{ fontSize: dim, color }} />
      <Typography variant={size === "small" ? "caption" : "body2"} sx={{ color, fontWeight: 650, lineHeight: 1.2 }}>
        {label}
      </Typography>
    </Stack>
  );
}
