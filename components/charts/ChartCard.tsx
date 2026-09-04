"use client";

import { Card, CardContent, Typography, Stack, Box, useTheme } from "@mui/material";

export default function ChartCard({
  title,
  subtitle,
  actions,
  footnote,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** small print under the chart, e.g. a note about units or data coverage */
  footnote?: React.ReactNode;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    // variant="outlined" here just opts into the MuiCard theme's border +
    // glass background treatment (defined once in theme.ts) — no local
    // color/blur overrides so every chart card stays visually consistent.
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        transition: "border-color 160ms ease, box-shadow 160ms ease",
        ...(isDark && {
          "&:hover": {
            borderColor: "rgba(90,169,255,0.28)",
          },
        }),
      }}
    >
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: subtitle ? 0.25 : 1.5 }}>
          <Typography variant="h6" sx={{ fontSize: 16 }}>
            {title}
          </Typography>
          {actions && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}
        </Stack>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {subtitle}
          </Typography>
        )}
        {children}
        {footnote && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
            {footnote}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
