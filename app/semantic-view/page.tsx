"use client";

import { useEffect, useState } from "react";
import { Box, Card, CardContent, Typography, Button, CircularProgress, Stack } from "@mui/material";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";

export default function SemanticViewPage() {
  const [yaml, setYaml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/semantic-view")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Compile failed");
        return res.text();
      })
      .then((text) => !cancelled && setYaml(text))
      .catch((err) => !cancelled && setError(err.message || "We couldn't retrieve this information."));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Advanced Intelligence · Semantic View"
        title="Semantic View Compiler"
        takeaway="The Snowflake Cortex Analyst semantic model, generated live from the conformed schema's real INFORMATION_SCHEMA metadata — not a hand-written YAML file. Every table, measure and dimension below reflects the actual approved ontology boundary."
        howThisWorks="Schema → the approved conformed tables' live column metadata (name, type, key) → a measure/dimension classification heuristic → generated YAML, ready for Cortex Analyst. Recompiled on every request, so it always reflects the current schema."
      />
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" sx={{ fontSize: 16 }}>
                Generated semantic model
              </Typography>
              {yaml && <StatusBadge tone="positive" label="Compiled from live schema" size="small" pill />}
              {error && <StatusBadge tone="critical" label="Compile failed" size="small" pill />}
            </Stack>
            {yaml && (
              <Button
                size="small"
                startIcon={<ContentCopyRoundedIcon fontSize="small" />}
                onClick={() => {
                  navigator.clipboard.writeText(yaml);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? "Copied" : "Copy YAML"}
              </Button>
            )}
          </Stack>

          {!yaml && !error && (
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 4 }}>
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                Compiling semantic model from live schema…
              </Typography>
            </Stack>
          )}

          {error && (
            <Typography variant="body2" color="error.main" sx={{ py: 2 }}>
              {error}
            </Typography>
          )}

          {yaml && (
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 2,
                borderRadius: 2,
                bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(6,8,18,0.6)" : "rgba(23,26,31,0.04)"),
                border: "1px solid",
                borderColor: "divider",
                fontSize: 12.5,
                lineHeight: 1.6,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                overflowX: "auto",
                maxHeight: 560,
              }}
            >
              {yaml}
            </Box>
          )}
        </CardContent>
      </Card>
    </>
  );
}
