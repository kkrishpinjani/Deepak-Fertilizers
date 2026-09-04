"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  TextField,
  Button,
  CircularProgress,
  Chip,
} from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";

type McpInfo = { name: string; protocol: string; tools: string[]; usage: string };
type ToolDef = { name: string; description: string; inputSchema: any };

export default function McpPage() {
  const [info, setInfo] = useState<McpInfo | null>(null);
  const [tools, setTools] = useState<ToolDef[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [args, setArgs] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const infoRes = await fetch("/api/mcp");
        const infoData: McpInfo = await infoRes.json();
        const listRes = await fetch("/api/mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
        });
        const listData = await listRes.json();
        if (cancelled) return;
        setInfo(infoData);
        setTools(listData.result?.tools ?? []);
        setSelected(listData.result?.tools?.[0]?.name ?? "");
      } catch {
        if (!cancelled) setError("We couldn't retrieve this information.");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function runTool() {
    if (!selected) return;
    setRunning(true);
    setResult(null);
    try {
      let parsedArgs: any = {};
      try {
        parsedArgs = args.trim() ? JSON.parse(args) : {};
      } catch {
        setResult("Arguments must be valid JSON, e.g. {\"question\": \"Why is EBITDA below plan?\"}");
        setRunning(false);
        return;
      }
      const res = await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: selected, arguments: parsedArgs } }),
      });
      const data = await res.json();
      setResult(data.result?.content?.[0]?.text ?? JSON.stringify(data.error ?? data, null, 2));
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Advanced Intelligence · MCP"
        title="MCP / AI Tools"
        takeaway="Expose governed finance intelligence to compatible AI clients. This server implements the real Model Context Protocol over JSON-RPC 2.0 — every tool call runs the same engine, Neo4j graph and MySQL data the Copilot UI uses, never a mocked response."
        howThisWorks="A compatible MCP client connects, calls tools/list to discover capabilities, then tools/call to invoke one — query_finance_data runs the full investigation pipeline, query_neo4j_ontology looks up a live entity neighborhood, and search_documents runs full-text search. Try any tool directly below."
      />
      <Stack spacing={3}>
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="h6" sx={{ fontSize: 16 }}>
                Server status
              </Typography>
              {info ? (
                <StatusBadge tone="positive" label="Reachable" size="small" pill />
              ) : error ? (
                <StatusBadge tone="critical" label="Unavailable" size="small" pill />
              ) : (
                <StatusBadge tone="neutral" label="Checking…" size="small" pill />
              )}
            </Stack>
            {error && (
              <Typography variant="body2" color="error.main">
                {error}
              </Typography>
            )}
            {info && (
              <Stack spacing={0.75}>
                <Typography variant="body2" color="text.secondary">
                  <strong>{info.name}</strong> · {info.protocol}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {info.usage}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  Connected clients: not tracked by this server — it is a stateless HTTP endpoint, not a session-based gateway.
                </Typography>
              </Stack>
            )}
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ fontSize: 16, mb: 1.5 }}>
              Available tools
            </Typography>
            {!tools && !error && <CircularProgress size={18} />}
            <Stack spacing={1.5}>
              {(tools ?? []).map((t) => (
                <Box
                  key={t.name}
                  onClick={() => setSelected(t.name)}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: selected === t.name ? "primary.main" : "divider",
                    cursor: "pointer",
                    bgcolor: selected === t.name ? "action.selected" : "transparent",
                    transition: "border-color 0.15s, background-color 0.15s",
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={t.name} sx={{ fontFamily: "monospace" }} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {t.description}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>

        {tools && tools.length > 0 && (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontSize: 16, mb: 1.5 }}>
                Try a tool call
              </Typography>
              <Stack spacing={1.5}>
                <TextField
                  label="Arguments (JSON)"
                  placeholder='{"question": "Why is EBITDA below plan?"}'
                  value={args}
                  onChange={(e) => setArgs(e.target.value)}
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                />
                <Button
                  variant="contained"
                  onClick={runTool}
                  disabled={running || !selected}
                  startIcon={running ? <CircularProgress size={16} color="inherit" /> : <PlayArrowRoundedIcon />}
                  sx={{ alignSelf: "flex-start" }}
                >
                  {running ? "Running…" : `Call ${selected}`}
                </Button>
                {result && (
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
                      maxHeight: 420,
                    }}
                  >
                    {result}
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>
    </>
  );
}
