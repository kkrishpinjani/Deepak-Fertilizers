"use client";

import { useState } from "react";
import { Box, Card, CardContent, Stack, Typography, Collapse, Divider, Link as MLink, useTheme } from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import TrendingFlatRoundedIcon from "@mui/icons-material/TrendingFlatRounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { type Tone } from "./StatusBadge";

export type InsightDriver = { label: string; detail?: string; tone?: Tone };

const DOT_COLOR: Record<string, string> = {
  positive: "success.main",
  critical: "error.main",
  watch: "warning.main",
};

function Block({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: typeof TrendingFlatRoundedIcon;
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Stack direction="row" spacing={0.6} alignItems="center">
        <Icon sx={{ fontSize: 14, color: "text.secondary", opacity: 0.85 }} />
        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "text.secondary" }}>
          {label}
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ mt: 0.4 }}>
        {children}
      </Typography>
    </Box>
  );
}

export default function AIInsightPanel({
  summary,
  drivers,
  impact,
  action,
  evidence,
}: {
  /** the plain-English "why is this happening" headline */
  summary: React.ReactNode;
  drivers?: InsightDriver[];
  impact?: React.ReactNode;
  action?: React.ReactNode;
  /** supporting detail revealed behind "Why is this happening?" */
  evidence?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Card
      variant="outlined"
      sx={{
        position: "relative",
        overflow: "hidden",
        borderColor: isDark ? "rgba(167,139,250,0.28)" : undefined,
        ...(isDark && {
          boxShadow: `0 0 0 1px rgba(167,139,250,0.12), 0 16px 40px rgba(8,6,20,0.5)`,
        }),
      }}
    >
      {/* corner accent — primary -> secondary gradient, reads as the "investigation" marker */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          width: 3,
          backgroundImage: (t) => `linear-gradient(180deg, ${t.palette.primary.main}, ${t.palette.secondary.main})`,
          boxShadow: isDark ? "0 0 14px rgba(167,139,250,0.55)" : "none",
        }}
      />
      {isDark && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage:
              "radial-gradient(420px 220px at 100% -10%, rgba(167,139,250,0.12), transparent 60%)," +
              "radial-gradient(360px 200px at -10% 110%, rgba(90,169,255,0.08), transparent 60%)",
          }}
        />
      )}

      <CardContent sx={{ position: "relative" }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
          <Box
            sx={{
              width: 26,
              height: 26,
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: isDark ? "rgba(167,139,250,0.14)" : "rgba(106,90,205,0.08)",
              color: "secondary.main",
              flexShrink: 0,
            }}
          >
            <AutoAwesomeRoundedIcon sx={{ fontSize: 15 }} />
          </Box>
          <Typography variant="overline" sx={{ color: "secondary.main" }}>
            AI Insight
          </Typography>
        </Stack>

        {/* WHY — the plain-English headline */}
        <Typography variant="body1" sx={{ mb: 1.75, fontWeight: 550, lineHeight: 1.55 }}>
          {summary}
        </Typography>

        <Stack spacing={1.75}>
          {drivers && drivers.length > 0 && (
            <Box>
              <Stack direction="row" spacing={0.6} alignItems="center">
                <TrendingFlatRoundedIcon sx={{ fontSize: 14, color: "text.secondary", opacity: 0.85 }} />
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "text.secondary" }}>
                  Key drivers
                </Typography>
              </Stack>
              <Stack spacing={0.65} sx={{ mt: 0.65 }}>
                {drivers.map((d, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                    <Box
                      sx={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        bgcolor: DOT_COLOR[d.tone || ""] || "text.secondary",
                        flexShrink: 0,
                        mt: "8px",
                        boxShadow: isDark && d.tone ? `0 0 6px ${DOT_COLOR[d.tone] === "success.main" ? "rgba(74,222,128,0.6)" : DOT_COLOR[d.tone] === "error.main" ? "rgba(248,113,113,0.6)" : "rgba(251,191,36,0.6)"}` : "none",
                      }}
                    />
                    <Typography variant="body2">
                      {d.label}
                      {d.detail && (
                        <Typography component="span" variant="body2" color="text.secondary">
                          {" "}
                          — {d.detail}
                        </Typography>
                      )}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}

          {impact && (
            <Block label="Business impact" icon={PaidRoundedIcon}>
              {impact}
            </Block>
          )}
          {action && (
            <Block label="Recommended action" icon={TaskAltRoundedIcon}>
              {action}
            </Block>
          )}
        </Stack>

        {evidence && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <MLink
              component="button"
              type="button"
              variant="body2"
              onClick={() => setOpen((o) => !o)}
              underline="hover"
              sx={{
                fontWeight: 650,
                display: "inline-flex",
                alignItems: "center",
                gap: 0.4,
                color: "secondary.main",
              }}
            >
              {open ? "Hide supporting evidence" : "Why is this happening? See the evidence"}
              <ExpandMoreRoundedIcon
                sx={{
                  fontSize: 18,
                  transition: "transform 200ms ease",
                  transform: open ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </MLink>
            <Collapse in={open} timeout={220}>
              <Box
                sx={{
                  mt: 1.5,
                  p: 1.5,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: isDark ? "rgba(148,163,220,0.14)" : "divider",
                  bgcolor: isDark ? "rgba(8,10,20,0.45)" : "rgba(0,0,0,0.02)",
                }}
              >
                {evidence}
              </Box>
            </Collapse>
          </>
        )}
      </CardContent>
    </Card>
  );
}
