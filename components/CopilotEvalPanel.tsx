"use client";

import { useState } from "react";
import { Card, CardContent, Typography, Button, Stack, Chip, CircularProgress, Table, TableHead, TableRow, TableCell, TableBody, Box } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import ScienceRoundedIcon from "@mui/icons-material/ScienceRounded";

export default function CopilotEvalPanel() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function run() {
    setRunning(true);
    try {
      const res = await fetch("/api/copilot/eval", { method: "POST" });
      setResult(await res.json());
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <ScienceRoundedIcon color="action" fontSize="small" />
          <Typography variant="h6">Evaluation Suite</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Runs the real copilot engine against 7 gold questions with fresh
          ground truth computed from the live data — checks intent routing,
          KPI accuracy (within tolerance), and safety guards. Every run is
          logged, not just the latest.
        </Typography>

        <Button variant="contained" onClick={run} disabled={running} startIcon={running ? <CircularProgress size={16} color="inherit" /> : undefined}>
          {running ? "Running suite…" : "Run evaluation"}
        </Button>

        {result && (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <Chip
                color={result.passed === result.total ? "success" : "warning"}
                label={`${result.passed}/${result.total} passed`}
              />
            </Stack>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Question</TableCell>
                  <TableCell>Intent</TableCell>
                  <TableCell>KPI (expected / actual)</TableCell>
                  <TableCell>Guards</TableCell>
                  <TableCell>Latency</TableCell>
                  <TableCell>Result</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.results.map((r: any) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{r.question}</TableCell>
                    <TableCell>
                      {r.intentActual}
                      {!r.intentPass && (
                        <Typography variant="caption" color="error.main" sx={{ display: "block" }}>
                          expected {r.expectedIntent}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.kpiExpected?.toLocaleString(undefined, { maximumFractionDigits: 0 })} /{" "}
                      {r.kpiActual?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? "—"}
                    </TableCell>
                    <TableCell>{r.guardsPass ? "OK" : "FAIL"}</TableCell>
                    <TableCell>{r.latencyMs} ms</TableCell>
                    <TableCell>
                      {r.overallPass ? (
                        <CheckCircleRoundedIcon color="success" fontSize="small" />
                      ) : (
                        <CancelRoundedIcon color="error" fontSize="small" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
