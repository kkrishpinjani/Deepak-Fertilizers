"use client";

import { Box, Card, CardContent, Typography, Stack, useTheme } from "@mui/material";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";

type Tone = "critical" | "watch" | "positive" | "info";
type Stage = { eyebrow: string; content: React.ReactNode; tone?: Tone };

const TONE_KEY: Record<Tone, string> = { critical: "error", watch: "warning", positive: "success", info: "info" };
const TONE_GLOW: Record<Tone, string> = {
  critical: "rgba(248,113,113,0.35)",
  watch: "rgba(251,191,36,0.32)",
  positive: "rgba(74,222,128,0.32)",
  info: "rgba(103,232,249,0.32)",
};

export default function RootCauseCascade({ stages }: { stages: Stage[] }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Stack spacing={0} alignItems="stretch">
      {stages.map((s, i) => (
        <Box key={i} sx={{ position: "relative" }}>
          <Card
            variant="outlined"
            sx={{
              borderLeft: "3px solid",
              borderLeftColor: s.tone ? `${TONE_KEY[s.tone]}.main` : "divider",
              position: "relative",
              transition: "box-shadow 200ms ease, border-color 200ms ease",
              ...(isDark &&
                s.tone && {
                  boxShadow: `0 0 0 1px ${TONE_GLOW[s.tone]}, 0 8px 24px rgba(2,4,12,0.35)`,
                }),
            }}
          >
            <CardContent sx={{ py: 1.75, "&:last-child": { pb: 1.75 } }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                    color: s.tone ? `${TONE_KEY[s.tone]}.main` : "text.secondary",
                    bgcolor: isDark ? "rgba(148,163,220,0.08)" : "rgba(23,26,31,0.05)",
                    border: "1px solid",
                    borderColor: s.tone ? `${TONE_KEY[s.tone]}.main` : "divider",
                  }}
                >
                  {i + 1}
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "text.secondary" }}>
                  {s.eyebrow}
                </Typography>
              </Stack>
              <Box sx={{ mt: 0.5, pl: 3.75 }}>
                {typeof s.content === "string" ? <Typography variant="body2">{s.content}</Typography> : s.content}
              </Box>
            </CardContent>
          </Card>
          {i < stages.length - 1 && (
            <Stack alignItems="center" sx={{ py: 0.35, position: "relative" }}>
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  width: 1,
                  bgcolor: isDark ? "rgba(148,163,220,0.18)" : "divider",
                }}
              />
              <ArrowDownwardRoundedIcon
                sx={{
                  fontSize: 18,
                  color: "text.secondary",
                  opacity: 0.6,
                  bgcolor: "background.default",
                  borderRadius: "50%",
                  position: "relative",
                  zIndex: 1,
                }}
              />
            </Stack>
          )}
        </Box>
      ))}
    </Stack>
  );
}
