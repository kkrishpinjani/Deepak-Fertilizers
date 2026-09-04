"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  Chip,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Divider,
  LinearProgress,
  Breadcrumbs,
  Link as MLink,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import GroupedBarChart from "./charts/GroupedBarChart";
import DivergingBarChart from "./charts/DivergingBarChart";
import DonutChart from "./charts/DonutChart";
import WaterfallChart from "./charts/WaterfallChart";
import HeatmapChart from "./charts/HeatmapChart";
import ScatterChart from "./charts/ScatterChart";
import { ChartUnit } from "./charts/format";
import StatusBadge, { type Tone } from "./StatusBadge";

const SUGGESTIONS = [
  "Why is EBITDA below plan?",
  "Which customers create the largest cash risk?",
  "Which materials have the largest purchase price variance?",
  "Where is production falling behind plan?",
];

const CONFIDENCE_TONE: Record<string, Tone> = {
  HIGH: "positive",
  MEDIUM: "watch",
  LOW: "critical",
};

export default function CopilotInvestigator({ initialQuestion }: { initialQuestion?: string }) {
  const [question, setQuestion] = useState(initialQuestion || SUGGESTIONS[0]);
  const askedInitial = useRef(false);
  const [loading, setLoading] = useState(false);
  // history[i] = { question, result } — a real drill-down trail, not just
  // the current answer. Clicking a driver row appends a new investigation
  // scoped to that dimension; breadcrumbs let you jump back up the chain.
  const [history, setHistory] = useState<{ question: string; result: any }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  // A real persisted MySQL thread (conformed.copilot_threads) spans the
  // whole conversation — every distinct question and drill-down appends
  // a row, and the LLM rationale for later questions gets the actual
  // prior Q&A as context. "New conversation" is the only thing that
  // starts a fresh thread; drilling into a driver stays in the same one.
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadCount, setThreadCount] = useState(0);

  const result = history[history.length - 1]?.result || null;

  useEffect(() => {
    if (initialQuestion && !askedInitial.current) {
      askedInitial.current = true;
      startNew(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  async function ensureThread(): Promise<string> {
    if (threadId) return threadId;
    const res = await fetch("/api/copilot/thread", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    const data = await res.json();
    setThreadId(data.id);
    return data.id;
  }

  async function investigate(q?: string, replaceFrom?: number, dimension?: string) {
    const finalQuestion = q ?? question;
    setLoading(true);
    setError(null);
    try {
      const tid = await ensureThread();
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: finalQuestion, dimension, threadId: tid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Investigation failed");
      setHistory((prev) => {
        const base = replaceFrom !== undefined ? prev.slice(0, replaceFrom) : prev;
        return [...base, { question: finalQuestion, result: data }];
      });
      setThreadCount((c) => c + 1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function startNew(q: string) {
    setQuestion(q);
    setHistory([]);
    investigate(q, 0);
  }

  function newConversation() {
    setThreadId(null);
    setThreadCount(0);
    setHistory([]);
    setError(null);
  }

  function drillInto(dimension: string) {
    investigate(`Why is ${dimension} below plan?`, undefined, dimension);
  }

  function jumpTo(index: number) {
    setHistory((prev) => prev.slice(0, index + 1));
  }

  async function decide(id: string, decision: "APPROVED" | "REJECTED") {
    setDecidingId(id);
    try {
      await fetch("/api/copilot/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, decision }),
      });
      setHistory((prev) =>
        prev.map((h, i) =>
          i === prev.length - 1 && h.result?.actionProposal?.id === id
            ? { ...h, result: { ...h.result, actionProposal: { ...h.result.actionProposal, status: decision } } }
            : h
        )
      );
    } finally {
      setDecidingId(null);
    }
  }

  const unit: ChartUnit = result?.kpi?.unit || "raw";
  const negativeRows = (result?.rows || []).filter((r: any) => r.variance < 0);

  return (
    <Stack spacing={3}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ask a CFO-style investigation question. This runs a real multi-step
            pipeline against the live MySQL data — intent classification, an
            ontology-scoped SQL query, KPI reconciliation, evidence scoring,
            confidence calibration, and (when warranted) an approval-gated
            action proposal. Click any negative driver below to drill into
            it — each click runs a fresh, real investigation scoped to that
            dimension.
          </Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            {SUGGESTIONS.map((s) => (
              <Chip key={s} label={s} size="small" variant="outlined" onClick={() => startNew(s)} />
            ))}
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              fullWidth
              size="small"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startNew(question)}
              placeholder="e.g. Which materials have the largest purchase price variance?"
            />
            <Button
              variant="contained"
              onClick={() => startNew(question)}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {loading ? "Investigating…" : "Investigate"}
            </Button>
          </Stack>

          {threadId && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
              <Chip
                size="small"
                color="secondary"
                variant="outlined"
                label={`Conversation memory on — ${threadCount} question${threadCount === 1 ? "" : "s"} in this thread`}
              />
              <Button size="small" onClick={newConversation}>
                New conversation
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>

      {history.length > 1 && (
        <Breadcrumbs>
          {history.map((h, i) => (
            <MLink
              key={i}
              component="button"
              underline={i === history.length - 1 ? "none" : "hover"}
              color={i === history.length - 1 ? "text.primary" : "primary"}
              onClick={() => jumpTo(i)}
              sx={{ fontWeight: i === history.length - 1 ? 700 : 400 }}
            >
              {h.question.length > 40 ? h.question.slice(0, 39) + "…" : h.question}
            </MLink>
          ))}
        </Breadcrumbs>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {result && (
        <>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="overline" color="text.secondary">
                  Investigation plan
                </Typography>
                <Chip
                  size="small"
                  variant="outlined"
                  color={result.intentVia === "ollama" ? "secondary" : "default"}
                  label={result.intentVia === "ollama" ? "Intent: local LLM (Qwen)" : "Intent: rule-based (LLM unavailable)"}
                />
                {result.agents?.length > 1 && (
                  <Chip
                    size="small"
                    variant="outlined"
                    color="info"
                    label={`Multi-agent: ${result.agents.join(" + ")}`}
                  />
                )}
              </Stack>
              <Stepper alternativeLabel sx={{ mt: 1 }}>
                {result.plan.steps.map((s: any) => (
                  <Step key={s.id} completed>
                    <StepLabel>{s.tool}</StepLabel>
                  </Step>
                ))}
              </Stepper>
              {result.plan.entities.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                  {result.plan.entities.map((e: string) => (
                    <Chip key={e} size="small" label={e} />
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {result.kpi.name}
                </Typography>
                <Typography variant="h4" sx={{ mt: 0.5 }}>
                  {fmtKpi(result.kpi.actual, unit)}
                </Typography>
                {result.kpi.plan !== 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Plan: {fmtKpi(result.kpi.plan, unit)}
                  </Typography>
                )}
                <Divider sx={{ my: 1.5 }} />
                <StatusBadge
                  tone={result.reconciliation.status === "RECONCILED" ? "positive" : "watch"}
                  label={result.reconciliation.status === "RECONCILED" ? "Numbers reconciled" : "Needs review"}
                />
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Confidence
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, mb: 1 }}>
                  <Typography variant="h4" sx={{ fontVariantNumeric: "tabular-nums" }}>
                    {(result.confidence.score * 100).toFixed(0)}%
                  </Typography>
                  <StatusBadge tone={CONFIDENCE_TONE[result.confidence.level]} label={`${result.confidence.level} confidence`} size="small" pill />
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={result.confidence.score * 100}
                  color={result.confidence.level === "HIGH" ? "success" : result.confidence.level === "MEDIUM" ? "warning" : "error"}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </CardContent>
            </Card>
          </Stack>

          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="h6">{result.recommendation.headline}</Typography>
                {result.recommendation.rationaleVia === "ollama" && (
                  <Chip size="small" color="secondary" variant="outlined" label="Written by local LLM" />
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {result.recommendation.rationale}
              </Typography>

              {result.chart.type === "donut" ? (
                <DonutChart data={result.rows.map((r: any) => ({ label: r.dimension, value: r.variance }))} unit={unit} />
              ) : result.chart.type === "bar-grouped" ? (
                <GroupedBarChart
                  data={result.rows.map((r: any) => ({ category: r.dimension, actual: r.actual, plan: r.plan }))}
                  series={[
                    { key: "actual", label: "Actual" },
                    { key: "plan", label: "Plan" },
                  ]}
                  unit={unit}
                />
              ) : result.chart.type === "waterfall" ? (
                <WaterfallChart
                  startLabel="Plan"
                  startValue={result.kpi.plan}
                  steps={result.rows.map((r: any) => ({ label: r.dimension, value: r.variance }))}
                  endLabel="Actual"
                  unit={unit}
                />
              ) : result.chart.type === "heatmap" ? (
                <HeatmapChart cells={result.matrix || []} unit={unit === "raw" ? "count" : unit} />
              ) : result.chart.type === "scatter" ? (
                <ScatterChart
                  data={result.rows.map((r: any) => ({ label: r.dimension, x: r.plan, y: r.actual, size: r.variance }))}
                  unit={unit}
                />
              ) : (
                <DivergingBarChart
                  data={result.rows.map((r: any) => ({ label: r.dimension, value: r.variance }))}
                  unit={unit}
                  maxRows={10}
                />
              )}
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                Chart: {result.chart.type} ({result.chart.reason})
              </Typography>

              {negativeRows.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                    Drill into a driver:
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Dimension</TableCell>
                        <TableCell>Variance</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {negativeRows.slice(0, 8).map((r: any) => (
                        <TableRow key={r.dimension} hover>
                          <TableCell>{r.dimension}</TableCell>
                          <TableCell sx={{ color: "error.main" }}>{r.variance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                          <TableCell align="right">
                            <Button size="small" startIcon={<SearchRoundedIcon />} onClick={() => drillInto(r.dimension)} disabled={loading}>
                              Investigate
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </CardContent>
          </Card>

          {result.actionProposal && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Proposed action
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>{result.actionProposal.type}</strong> — {result.actionProposal.target}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {result.actionProposal.reason}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <StatusBadge
                    tone={
                      result.actionProposal.status === "APPROVED"
                        ? "positive"
                        : result.actionProposal.status === "REJECTED"
                        ? "critical"
                        : "watch"
                    }
                    label={
                      result.actionProposal.status === "APPROVED"
                        ? "Approved"
                        : result.actionProposal.status === "REJECTED"
                        ? "Rejected"
                        : "Awaiting your approval"
                    }
                    pill
                  />
                  {result.actionProposal.status === "PENDING_HUMAN_APPROVAL" && (
                    <>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        disabled={decidingId === result.actionProposal.id}
                        onClick={() => decide(result.actionProposal.id, "APPROVED")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        disabled={decidingId === result.actionProposal.id}
                        onClick={() => decide(result.actionProposal.id, "REJECTED")}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
                  This can only ever be a proposal — the copilot has no path to execute it against SAP, Anaplan, or anything else.
                </Typography>
              </CardContent>
            </Card>
          )}

          <Card variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary" gutterBottom>
                Evidence
              </Typography>
              <Stack spacing={1} sx={{ mt: 1 }}>
                {result.evidence.map((e: any, i: number) => (
                  <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
                    <Chip size="small" label={e.type} sx={{ mt: 0.25 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2">
                        {e.source} — relevance {(e.relevance * 100).toFixed(0)}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", wordBreak: "break-word" }}>
                        {e.detail}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </>
      )}
    </Stack>
  );
}

function fmtKpi(n: number, unit: ChartUnit) {
  if (unit === "inr-millions") return `₹${(n / 1_000_000).toFixed(2)}M`;
  if (unit === "count") return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toLocaleString();
}
