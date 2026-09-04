"use client";

import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  MenuItem,
  Select,
  Typography,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Alert,
  Collapse,
  Chip,
  Stack,
  CircularProgress,
} from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CodeRoundedIcon from "@mui/icons-material/CodeRounded";
import { VERIFIED_QUERIES } from "@/lib/queries";

type QueryResult = {
  question: string;
  sources: string[];
  sql: string;
  rows: Record<string, any>[];
  executionMs: number;
};

const STATUS_COLOR: Record<string, "error" | "warning" | "success"> = {
  "AT RISK": "error",
  WATCH: "warning",
  "ON TRACK": "success",
};

function formatCell(value: any) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    return Math.abs(value) >= 1000
      ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : value.toFixed(2);
  }
  return String(value);
}

function cellColor(column: string, value: any): string | undefined {
  if (typeof value !== "number") return undefined;
  const col = column.toLowerCase();
  if (col.includes("variance")) return value < 0 ? "error.main" : value > 0 ? "success.main" : undefined;
  if (col.includes("attainment") || col.includes("margin_percent")) {
    return value >= 100 ? "success.main" : value >= 90 ? "warning.main" : "error.main";
  }
  return undefined;
}

export default function QueryRunner({
  ids,
  title = "Finance Query Lab",
  subtitle = "Ready-made reports comparing actuals to plan.",
}: {
  ids?: string[];
  title?: string;
  subtitle?: string;
}) {
  const queries = ids ? VERIFIED_QUERIES.filter((q) => ids.includes(q.id)) : VERIFIED_QUERIES;
  const [selected, setSelected] = useState(queries[0].id);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/query?id=${selected}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Query failed");
      setResult(data);
    } catch (err: any) {
      setError(err.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const columns = result?.rows?.[0] ? Object.keys(result.rows[0]) : [];

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center">
          <AutoAwesomeRoundedIcon color="primary" fontSize="small" />
          <Typography variant="h6">{title}</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 0.5 }}>
          {subtitle}
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2, mb: 2 }} alignItems={{ sm: "center" }}>
          <Select
            size="small"
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setResult(null);
              setError(null);
            }}
            sx={{ minWidth: { sm: 380 } }}
          >
            {queries.map((q) => (
              <MenuItem key={q.id} value={q.id}>
                {q.question}
              </MenuItem>
            ))}
          </Select>
          <Button
            variant="contained"
            onClick={run}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {loading ? "Running…" : "Run report"}
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {result && (
          <>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }} alignItems="center">
              {result.sources.map((s) => (
                <Chip key={s} size="small" label={s} variant="outlined" />
              ))}
              <Button
                size="small"
                onClick={() => setShowDetails((s) => !s)}
                startIcon={<CodeRoundedIcon fontSize="small" />}
                sx={{ ml: "auto" }}
              >
                {showDetails ? "Hide technical details" : "Technical details"}
              </Button>
            </Stack>
            <Collapse in={showDetails}>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <Chip size="small" variant="outlined" label={`${result.executionMs} ms`} />
              </Stack>
              <Box
                component="pre"
                sx={{
                  bgcolor: "grey.900",
                  color: "grey.100",
                  p: 2,
                  borderRadius: 1,
                  overflowX: "auto",
                  fontSize: 13,
                  mb: 2,
                }}
              >
                {result.sql}
              </Box>
            </Collapse>

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
                  {result.rows.map((row, i) => (
                    <TableRow
                      key={i}
                      hover
                      sx={{ "&:nth-of-type(odd)": { bgcolor: "action.hover" } }}
                    >
                      {columns.map((c) => {
                        const value = row[c];
                        if (
                          (c.toLowerCase().includes("status") || c.toLowerCase() === "risk_status") &&
                          typeof value === "string" &&
                          STATUS_COLOR[value]
                        ) {
                          return (
                            <TableCell key={c}>
                              <Chip size="small" color={STATUS_COLOR[value]} label={value} />
                            </TableCell>
                          );
                        }
                        return (
                          <TableCell key={c} sx={{ color: cellColor(c, value), fontWeight: cellColor(c, value) ? 600 : 400 }}>
                            {formatCell(value)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                  {result.rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={columns.length || 1}>
                        No results for this report.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}
