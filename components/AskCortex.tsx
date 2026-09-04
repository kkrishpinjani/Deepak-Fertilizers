"use client";

import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Box,
  CircularProgress,
  InputAdornment,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import StatusBadge from "./StatusBadge";
import { glow } from "./theme";

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
  "Why is EBITDA below plan this month?",
  "Which plants missed budget?",
  "What is our gross margin?",
  "Which business unit is driving the revenue shortfall?",
];

export default function AskCortex({ initialQuestion }: { initialQuestion?: string }) {
  const [question, setQuestion] = useState(initialQuestion || SUGGESTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const askedInitial = useRef(false);

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

  useEffect(() => {
    if (initialQuestion && !askedInitial.current) {
      askedInitial.current = true;
      ask(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  const columns = result?.rows?.[0] ? Object.keys(result.rows[0]) : [];

  return (
    <Stack spacing={3}>
      <Card
        variant="outlined"
        sx={{
          position: "relative",
          overflow: "hidden",
          backgroundImage: (t) => (t.palette.mode === "dark" ? glow.heroBackground : "none"),
        }}
      >
        <CardContent sx={{ py: { xs: 3, sm: 4 } }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: "primary.main" }} />
            <Typography variant="overline" color="text.secondary">
              Ask the company&rsquo;s intelligence system
            </Typography>
          </Stack>
          <Typography variant="h5" sx={{ mb: 2.5, fontFamily: "var(--font-serif), Georgia, serif", fontWeight: 600 }}>
            Ask anything about your business…
          </Typography>

          <Box
            sx={{
              p: "3px",
              borderRadius: 3,
              background: (t) =>
                t.palette.mode === "dark"
                  ? "linear-gradient(120deg, rgba(90,169,255,0.55), rgba(167,139,250,0.4), rgba(103,232,249,0.4))"
                  : "transparent",
              transition: "box-shadow 0.2s",
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{
                bgcolor: "background.paper",
                borderRadius: 2.4,
                p: 1,
                border: (t) => (t.palette.mode === "dark" ? "none" : "1px solid"),
                borderColor: "divider",
              }}
            >
              <TextField
                fullWidth
                variant="standard"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder='e.g. "Why did Taloja miss revenue budget?"'
                onKeyDown={(e) => e.key === "Enter" && ask()}
                InputProps={{
                  disableUnderline: true,
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" sx={{ color: "text.secondary", ml: 1 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ px: 1, "& input": { py: 1.1, fontSize: 15 } }}
              />
              <Button
                variant="contained"
                onClick={() => ask()}
                disabled={loading}
                sx={{ px: 3, flexShrink: 0 }}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeRoundedIcon fontSize="small" />}
              >
                {loading ? "Investigating…" : "Ask"}
              </Button>
            </Stack>
          </Box>

          <Typography variant="caption" sx={{ display: "block", mt: 1.5, mb: 1, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "text.secondary" }}>
            Suggested questions
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
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
                sx={{
                  borderColor: "divider",
                  "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
                }}
              />
            ))}
          </Stack>
        </CardContent>
      </Card>

      {error && (
        <Card variant="outlined" sx={{ borderColor: "error.main" }}>
          <CardContent>
            <StatusBadge tone="critical" label="Couldn't answer that" />
            <Typography variant="body2" sx={{ mt: 0.75 }}>
              {error}
            </Typography>
          </CardContent>
        </Card>
      )}

      {result && !result.matched && (
        <Card variant="outlined" sx={{ borderLeft: "3px solid", borderLeftColor: "warning.main" }}>
          <CardContent>
            <StatusBadge tone="watch" label="No confident match" />
            <Typography variant="body2" sx={{ mt: 1 }}>
              {result.message || "I couldn't find a confident answer to that. Try one of these instead:"}
            </Typography>
            <Stack spacing={0.5} sx={{ mt: 1.5 }}>
              {result.suggestions?.map((s: any) => (
                <Typography key={s.id} variant="body2" sx={{ cursor: "pointer", color: "primary.main" }} onClick={() => ask(s.question)}>
                  {s.question}
                </Typography>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {result?.matched && (
        <Card variant="outlined" sx={{ borderLeft: "3px solid", borderLeftColor: "success.main" }}>
          <CardContent>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center" flexWrap="wrap" useFlexGap>
              <StatusBadge tone="positive" label="Direct answer" />
              {result.engine === "ollama" && <Chip size="small" variant="outlined" label="Answered by local LLM" />}
              {result.engine === "keyword-match" && <Chip size="small" variant="outlined" label="Matched by keyword" />}
              {typeof result.confidence === "number" && result.confidence < 1 && (
                <Chip size="small" variant="outlined" label="Approximate match" />
              )}
            </Stack>

            {result.text && (
              <Typography variant="body1" sx={{ mb: 2.5 }}>
                {result.text}
              </Typography>
            )}

            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "text.secondary" }}>
              Key numbers
            </Typography>
            <Box sx={{ overflowX: "auto", mt: 1 }}>
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
                        <TableCell key={c} sx={{ fontVariantNumeric: "tabular-nums" }}>
                          {formatCell(row[c])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </CardContent>
        </Card>
      )}

      {!result && !error && (
        <Typography variant="body2" color="text.secondary">
          Need a deeper investigation with root causes, confidence scoring and a recommended action? Try{" "}
          <Typography component="a" href="/copilot" variant="body2" sx={{ color: "primary.main", fontWeight: 650 }}>
            CFO Copilot
          </Typography>{" "}
          instead.
        </Typography>
      )}
    </Stack>
  );
}
