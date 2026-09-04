"use client";

import { useEffect, useState } from "react";
import { Box, Typography, Stack, Chip, Button, Alert, CircularProgress, useTheme, Theme } from "@mui/material";

const COLUMN_ORDER = ["Company", "Plant", "CostCenter", "ProfitCenter", "Product", "Customer", "Vendor", "GLAccount"];

type CenterNode = { label: string; id: string; name: string };
type NeighborNode = { label: string; id: string; name: string; relType: string; outgoing: boolean };

export default function GraphExplorer() {
  const theme = useTheme();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  // Click-to-expand/re-center (V5): when set, the SVG switches from the
  // static column layout to a star layout around this node, fetched
  // live from Neo4j on every click — a real traversal, not a client-side
  // filter of the same 150-edge sample.
  const [center, setCenter] = useState<{ center: CenterNode; neighbors: NeighborNode[] } | null>(null);
  const [centerLoading, setCenterLoading] = useState(false);
  const [centerError, setCenterError] = useState<string | null>(null);

  async function focusNode(label: string, id: string) {
    setCenterLoading(true);
    setCenterError(null);
    try {
      const res = await fetch(`/api/ontology/graph/node?label=${encodeURIComponent(label)}&id=${encodeURIComponent(id)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load node");
      setCenter(json);
    } catch (err: any) {
      setCenterError(err.message);
    } finally {
      setCenterLoading(false);
    }
  }

  function exitFocus() {
    setCenter(null);
    setCenterError(null);
  }

  async function load() {
    setError(null);
    try {
      const res = await fetch("/api/ontology/graph");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load graph");
      setData(json);
    } catch (err: any) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function seed() {
    setSeeding(true);
    setError(null);
    try {
      const res = await fetch("/api/ontology/graph", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Seed failed");
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSeeding(false);
    }
  }

  if (error) {
    return (
      <Box>
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This graph lives in a real Neo4j container dedicated to this project
          (<code>docker-compose.yml</code>). Start it, then reseed.
        </Typography>
        <Button variant="outlined" onClick={load}>
          Retry
        </Button>
      </Box>
    );
  }

  if (!data) {
    return <CircularProgress size={20} />;
  }

  if (center) {
    return (
      <NodeFocusView
        center={center.center}
        neighbors={center.neighbors}
        loading={centerLoading}
        error={centerError}
        onFocus={focusNode}
        onExit={exitFocus}
        palette={PALETTE(theme)}
      />
    );
  }

  const labels = COLUMN_ORDER.filter((l) => data.stats.nodeCounts.some((n: any) => n.labels[0] === l));
  const nodesByLabel: Record<string, { id: string; name: string }[]> = {};
  for (const e of data.sample) {
    nodesByLabel[e.fromLabel] = nodesByLabel[e.fromLabel] || [];
    if (!nodesByLabel[e.fromLabel].some((n) => n.id === e.fromId)) nodesByLabel[e.fromLabel].push({ id: e.fromId, name: e.fromName });
    nodesByLabel[e.toLabel] = nodesByLabel[e.toLabel] || [];
    if (!nodesByLabel[e.toLabel].some((n) => n.id === e.toId)) nodesByLabel[e.toLabel].push({ id: e.toId, name: e.toName });
  }

  const width = 900;
  const height = 420;
  const colW = width / Math.max(labels.length, 1);
  const positions: Record<string, { x: number; y: number; label: string }> = {};
  labels.forEach((label, ci) => {
    const nodes = nodesByLabel[label] || [];
    const rowH = height / Math.max(nodes.length + 1, 2);
    nodes.forEach((n, ri) => {
      positions[`${label}:${n.id}`] = { x: ci * colW + colW / 2, y: (ri + 1) * rowH, label };
    });
  });

  const palette = PALETTE(theme);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }} flexWrap="wrap">
        <Typography variant="body2" color="text.secondary">
          Live from the Neo4j container — {data.stats.nodeCounts.reduce((s: number, n: any) => s + n.count, 0)} nodes,{" "}
          {data.stats.relCounts.reduce((s: number, r: any) => s + r.count, 0)} relationships.
        </Typography>
        <Button size="small" variant="outlined" onClick={seed} disabled={seeding}>
          {seeding ? <CircularProgress size={16} /> : "Reseed from MySQL"}
        </Button>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        {labels.map((l) => (
          <Chip key={l} size="small" label={l} sx={{ bgcolor: palette[l], color: "#fff" }} />
        ))}
      </Stack>

      <Box sx={{ overflowX: "auto" }}>
        <svg width={width} height={height} style={{ maxWidth: "100%" }}>
          {data.sample.map((e: any, i: number) => {
            const from = positions[`${e.fromLabel}:${e.fromId}`];
            const to = positions[`${e.toLabel}:${e.toId}`];
            if (!from || !to) return null;
            const dimmed = hover && hover !== e.fromId && hover !== e.toId;
            return (
              <line
                key={i}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={theme.palette.divider}
                strokeWidth={1}
                opacity={dimmed ? 0.15 : 0.6}
              />
            );
          })}
          {Object.entries(positions).map(([key, pos]) => {
            const [label, id] = key.split(":");
            const name = (nodesByLabel[label] || []).find((n) => n.id === id)?.name || id;
            return (
              <g
                key={key}
                onMouseEnter={() => setHover(id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => focusNode(label, id)}
                style={{ cursor: "pointer" }}
              >
                <circle cx={pos.x} cy={pos.y} r={6} fill={palette[label] || theme.palette.primary.main} />
                <text x={pos.x} y={pos.y - 10} textAnchor="middle" fontSize={10} fill={theme.palette.text.secondary}>
                  {name.length > 16 ? name.slice(0, 15) + "…" : name}
                </text>
              </g>
            );
          })}
        </svg>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
        Click any node to expand its live neighborhood from Neo4j.
      </Typography>
    </Box>
  );
}

function PALETTE(theme: Theme): Record<string, string> {
  return {
    Company: theme.palette.primary.main,
    Plant: theme.palette.secondary.main,
    CostCenter: theme.palette.warning.main,
    ProfitCenter: theme.palette.info?.main || theme.palette.secondary.main,
    Product: theme.palette.success.main,
    Customer: theme.palette.error.main,
    Vendor: "#9c6ade",
    GLAccount: theme.palette.text.secondary,
  };
}

function NodeFocusView({
  center,
  neighbors,
  loading,
  error,
  onFocus,
  onExit,
  palette,
}: {
  center: CenterNode;
  neighbors: NeighborNode[];
  loading: boolean;
  error: string | null;
  onFocus: (label: string, id: string) => void;
  onExit: () => void;
  palette: Record<string, string>;
}) {
  const theme = useTheme();
  const width = 700;
  const height = 420;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 70;

  const positions = neighbors.map((n, i) => {
    const angle = (2 * Math.PI * i) / Math.max(1, neighbors.length) - Math.PI / 2;
    return { ...n, x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Live neighborhood of <strong>{center.name}</strong> ({center.label}) — {neighbors.length} connection
          {neighbors.length === 1 ? "" : "s"}.
        </Typography>
        <Button size="small" variant="outlined" onClick={onExit}>
          Back to full graph
        </Button>
      </Stack>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <CircularProgress size={20} />
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <svg width={width} height={height} style={{ maxWidth: "100%" }}>
            {positions.map((n, i) => (
              <line key={i} x1={cx} y1={cy} x2={n.x} y2={n.y} stroke={theme.palette.divider} strokeWidth={1} opacity={0.6} />
            ))}
            {positions.map((n, i) => {
              const midX = (cx + n.x) / 2;
              const midY = (cy + n.y) / 2;
              return (
                <text key={`rel-${i}`} x={midX} y={midY} textAnchor="middle" fontSize={9} fill={theme.palette.text.secondary}>
                  {n.outgoing ? `→ ${n.relType}` : `${n.relType} →`}
                </text>
              );
            })}
            <g onClick={() => onFocus(center.label, center.id)} style={{ cursor: "pointer" }}>
              <circle cx={cx} cy={cy} r={12} fill={palette[center.label] || theme.palette.primary.main} />
              <text x={cx} y={cy - 18} textAnchor="middle" fontSize={12} fontWeight={700} fill={theme.palette.text.primary}>
                {center.name}
              </text>
            </g>
            {positions.map((n) => (
              <g key={n.id} onClick={() => onFocus(n.label, n.id)} style={{ cursor: "pointer" }}>
                <circle cx={n.x} cy={n.y} r={7} fill={palette[n.label] || theme.palette.primary.main} />
                <text x={n.x} y={n.y - 12} textAnchor="middle" fontSize={10} fill={theme.palette.text.secondary}>
                  {n.name.length > 18 ? n.name.slice(0, 17) + "…" : n.name}
                </text>
              </g>
            ))}
          </svg>
        </Box>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
        Click any neighbor to re-center the graph on it — each click is a fresh Cypher query.
      </Typography>
    </Box>
  );
}
