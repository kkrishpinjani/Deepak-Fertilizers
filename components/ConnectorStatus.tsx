"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, Typography, Stack, Chip, CircularProgress, Box } from "@mui/material";

export default function ConnectorStatus() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/connectors")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <CircularProgress size={20} />;

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Every connector this project has real client code for. Active ones
          run against real local infrastructure (Docker Neo4j, local Ollama).
          Dormant ones are real, tested-shape client code with no live
          account to activate against — set their env vars to turn them on.
        </Typography>
        <Stack spacing={1.5}>
          {data.connectors.map((c: any) => (
            <Box key={c.name}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle2">{c.name}</Typography>
                <Chip size="small" variant="outlined" label={c.mode} />
                <Chip
                  size="small"
                  color={c.healthy ? "success" : c.configured ? "warning" : "default"}
                  label={c.healthy ? "Healthy" : c.configured ? "Configured, not reachable" : "Not configured"}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {c.detail}
              </Typography>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
