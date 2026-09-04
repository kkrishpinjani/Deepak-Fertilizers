"use client";

import { useState } from "react";
import { Box, Card, CardContent, Stack, Typography, Collapse, Divider, Link as MLink } from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import { type Tone } from "./StatusBadge";

export type InsightDriver = { label: string; detail?: string; tone?: Tone };

const DOT_COLOR: Record<string, string> = {
  positive: "success.main",
  critical: "error.main",
  watch: "warning.main",
};

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "text.secondary" }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.35 }}>
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

  return (
    <Card variant="outlined" sx={{ borderLeft: "3px solid", borderLeftColor: "secondary.main" }}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
          <AutoAwesomeRoundedIcon sx={{ fontSize: 17, color: "secondary.main" }} />
          <Typography variant="overline" sx={{ color: "secondary.main" }}>
            AI Insight
          </Typography>
        </Stack>

        <Typography variant="body1" sx={{ mb: 1.75 }}>
          {summary}
        </Typography>

        <Stack spacing={1.5}>
          {drivers && drivers.length > 0 && (
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "text.secondary" }}>
                Key drivers
              </Typography>
              <Stack spacing={0.6} sx={{ mt: 0.6 }}>
                {drivers.map((d, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                    <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: DOT_COLOR[d.tone || ""] || "text.secondary", flexShrink: 0, mt: "8px" }} />
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

          {impact && <Block label="Business impact">{impact}</Block>}
          {action && <Block label="Recommended action">{action}</Block>}
        </Stack>

        {evidence && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <MLink component="button" type="button" variant="body2" onClick={() => setOpen((o) => !o)} sx={{ fontWeight: 650 }}>
              {open ? "Hide supporting evidence" : "Why is this happening? See the evidence"}
            </MLink>
            <Collapse in={open}>
              <Box sx={{ mt: 1.5 }}>{evidence}</Box>
            </Collapse>
          </>
        )}
      </CardContent>
    </Card>
  );
}
