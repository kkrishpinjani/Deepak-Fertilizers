"use client";

import { Card, CardContent, Typography, Stack, Box, Tooltip } from "@mui/material";
import Link from "next/link";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import type SvgIcon from "@mui/material/SvgIcon";
import StatusBadge, { useToneColor, type Tone } from "./StatusBadge";

type SvgIconComponent = typeof SvgIcon;

export default function KpiCard({
  label,
  value,
  status,
  comparison,
  helpText,
  icon: Icon,
  percent,
  href,
}: {
  label: string;
  value: string;
  /** e.g. { tone: "watch", label: "Behind plan" } — always icon + word, never color alone. */
  status?: { tone: Tone; label: string };
  /** short line under the status, e.g. "₹0.21M below plan" */
  comparison?: string;
  /** one-line "what this means" shown via an info tooltip */
  helpText?: string;
  icon?: SvgIconComponent;
  /** 0-100+, renders a mini progress bar (e.g. plan attainment) */
  percent?: number;
  /** when set, the whole card links to a detail view (click-to-drill) */
  href?: string;
}) {
  const tone: Tone = status?.tone ?? "neutral";
  const accent = useToneColor(tone);

  const content = (
    <Card
      variant="outlined"
      sx={{
        minHeight: 148,
        position: "relative",
        overflow: "hidden",
        height: "100%",
        transition: "border-color 0.15s, transform 0.15s, box-shadow 0.15s",
        ...(href && {
          cursor: "pointer",
          "&:hover": {
            borderColor: "primary.main",
            transform: "translateY(-2px)",
            boxShadow: (t) => (t.palette.mode === "dark" ? `0 0 0 1px ${accent}55, 0 14px 32px ${accent}22` : undefined),
          },
        }),
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          bgcolor: accent,
          opacity: 0.9,
          boxShadow: (t) => (t.palette.mode === "dark" ? `0 0 12px ${accent}` : "none"),
        }}
      />
      <CardContent>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="body2" color="text.secondary" fontWeight={650}>
              {label}
            </Typography>
            {helpText && (
              <Tooltip title={helpText} arrow placement="top">
                <InfoOutlinedIcon sx={{ fontSize: 14, color: "text.secondary", opacity: 0.6 }} />
              </Tooltip>
            )}
          </Stack>
          {Icon && (
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(42,95,176,0.07)"),
                color: "primary.main",
                flexShrink: 0,
              }}
            >
              <Icon fontSize="small" />
            </Box>
          )}
        </Stack>

        <Typography variant="h4" sx={{ mt: 0.75, fontSize: 27, fontVariantNumeric: "tabular-nums" }}>
          {value}
        </Typography>

        {status && (
          <Box sx={{ mt: 0.75 }}>
            <StatusBadge tone={status.tone} label={status.label} size="small" />
          </Box>
        )}

        {comparison && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.35 }}>
            {comparison}
          </Typography>
        )}

        {typeof percent === "number" && (
          <Box sx={{ mt: 1.25, height: 6, borderRadius: 3, bgcolor: "action.hover", overflow: "hidden" }}>
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

        {href && (
          <Stack direction="row" alignItems="center" spacing={0.25} sx={{ mt: 1, color: "primary.main" }}>
            <Typography variant="caption" fontWeight={650}>
              View details
            </Typography>
            <ChevronRightRoundedIcon sx={{ fontSize: 15 }} />
          </Stack>
        )}
      </CardContent>
    </Card>
  );

  if (!href) return content;
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}>
      {content}
    </Link>
  );
}
