"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Box,
  CircularProgress,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";

function formatCell(value: any) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    return Math.abs(value) >= 1000
      ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : value.toFixed(2);
  }
  return String(value);
}

const SUGGESTIONS = [
  "Which plants missed budget?",
  "What is our gross margin?",
  "Why did we miss revenue plan?",
  "What is our EBITDA?",
];

export default function AskCortex() {
  const [question, setQuestion] = useState("Which plants missed budget?");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(q?: string) {
    const finalQuestion = q ?? question;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: finalQuestion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const columns = result?.rows?.[0] ? Object.keys(result.rows[0]) : [];

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          No need to know table or column names — just ask, or try one of these:
        </Typography>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          {SUGGESTIONS.map((s) => (
            <Chip
              key={s}
              label={s}
              size="small"
              variant="outlined"
              onClick={() => {
                setQuestion(s);
                ask(s);
              }}
            />
          ))}
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder='e.g. "Why did Pune plant miss revenue budget?"'
            onKeyDown={(e) => e.key === "Enter" && ask()}
          />
          <Button
            variant="contained"
            onClick={() => ask()}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {loading ? "Thinking…" : "Ask"}
          </Button>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {result && !result.matched && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {result.message || "I couldn't find a confident answer to that. Try one of these instead:"}
            <ul>
              {result.suggestions?.map((s: any) => (
                <li key={s.id}>{s.question}</li>
              ))}
            </ul>
          </Alert>
        )}

        {result?.matched && (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center" flexWrap="wrap">
              <Chip
                size="small"
                color="success"
                icon={<CheckCircleRoundedIcon />}
                label="Answer found"
              />
              {result.engine === "ollama" && (
                <Chip size="small" color="secondary" variant="outlined" label="Answered by local LLM (Qwen)" />
              )}
              {result.engine === "keyword-match" && (
                <Chip size="small" variant="outlined" label="Matched by keyword (LLM unavailable)" />
              )}
              {typeof result.confidence === "number" && result.confidence < 1 && (
                <Chip size="small" variant="outlined" label="Approximate match" />
              )}
            </Stack>
            {result.text && (
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                {result.text}
              </Typography>
            )}
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {columns.map((c) => (
                      <TableCell key={c}>{c.replace(/_/g, " ")}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {result.rows.map((row: any, i: number) => (
                    <TableRow key={i} hover>
                      {columns.map((c) => (
                        <TableCell key={c}>{formatCell(row[c])}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}
