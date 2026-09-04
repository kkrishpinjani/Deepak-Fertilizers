"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, forceX, forceY, type SimulationNodeDatum } from "d3-force";
import {
  Box,
  Typography,
  Stack,
  Chip,
  Button,
  Alert,
  CircularProgress,
  IconButton,
  Divider,
  useTheme,
  Theme,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import CenterFocusStrongRoundedIcon from "@mui/icons-material/CenterFocusStrongRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

const COLUMN_ORDER = ["Company", "Plant", "CostCenter", "ProfitCenter", "Product", "Customer", "Vendor", "GLAccount"];

type Edge = { fromLabel: string; fromId: string; fromName: string; relType: string; toLabel: string; toId: string; toName: string };
type GNode = SimulationNodeDatum & { key: string; label: string; id: string; name: string; degree: number };
type GLink = { source: string; target: string; relType: string };

type NeighborDetail = { label: string; id: string; name: string; relType: string; outgoing: boolean };
type DetailPanel = { center: { label: string; id: string; name: string }; neighbors: NeighborDetail[] };

const WIDTH = 900;
const HEIGHT = 520;

function keyOf(label: string, id: string) {
  return `${label}::${id}`;
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

// Real Neo4j data isn't limited to the 8 core dimension types above —
// e.g. loading the source catalog into the graph adds `CatalogEntity`
// nodes. Any label outside the known set still gets its own distinct,
// stable color instead of silently falling back to one shared color.
const EXTRA_COLORS = ["#e0894a", "#4fb0c6", "#c65fae", "#7fbf5f", "#d6c15f", "#6f8fd6", "#b0714f", "#5fbf9f", "#a35fd6", "#d66f7f"];
function colorForLabel(label: string, known: Record<string, string>) {
  if (known[label]) return known[label];
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return EXTRA_COLORS[hash % EXTRA_COLORS.length];
}

function nodeRadius(degree: number) {
  return Math.min(16, 5.5 + degree * 1.15);
}

export default function GraphExplorer() {
  const theme = useTheme();
  const palette = PALETTE(theme);

  const [data, setData] = useState<{ stats: any; sample: Edge[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const [nodes, setNodes] = useState<GNode[]>([]);
  const linksRef = useRef<GLink[]>([]);
  // The simulation can spread nodes well beyond a fixed canvas — this is
  // recomputed once the layout settles so every node is guaranteed to be
  // inside the visible (and clickable) viewBox, not clipped off-canvas.
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: WIDTH, h: HEIGHT });

  const [hoverNode, setHoverNode] = useState<string | null>(null);
  const [hoverEdge, setHoverEdge] = useState<{ x: number; y: number; label: string; from: string; to: string } | null>(null);
  const [hiddenLabels, setHiddenLabels] = useState<Set<string>>(new Set());

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailPanel | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const dragState = useRef<{ dragging: boolean; lastX: number; lastY: number }>({ dragging: false, lastX: 0, lastY: 0 });

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

  // Build the node/link set from the sample and run a real force simulation
  // to lay it out — replaces the old static column grid with organic,
  // physically-spaced positions like a real graph explorer.
  useEffect(() => {
    if (!data) return;
    const byKey = new Map<string, GNode>();
    for (const e of data.sample) {
      const fk = keyOf(e.fromLabel, e.fromId);
      const tk = keyOf(e.toLabel, e.toId);
      if (!byKey.has(fk)) byKey.set(fk, { key: fk, label: e.fromLabel, id: e.fromId, name: e.fromName, degree: 0 });
      if (!byKey.has(tk)) byKey.set(tk, { key: tk, label: e.toLabel, id: e.toId, name: e.toName, degree: 0 });
      byKey.get(fk)!.degree += 1;
      byKey.get(tk)!.degree += 1;
    }
    const nodeArr = Array.from(byKey.values());
    const linkArr: GLink[] = data.sample.map((e) => ({ source: keyOf(e.fromLabel, e.fromId), target: keyOf(e.toLabel, e.toId), relType: e.relType }));
    linksRef.current = linkArr;

    const sim = forceSimulation(nodeArr as SimulationNodeDatum[])
      .force(
        "link",
        forceLink(linkArr as any)
          .id((d: any) => d.key)
          .distance(56)
          .strength(0.75)
      )
      .force("charge", forceManyBody().strength(-85))
      .force("center", forceCenter(WIDTH / 2, HEIGHT / 2))
      // Weak per-node gravity toward the center — without this, small
      // disconnected clusters (e.g. a lone Vendor pair) drift arbitrarily
      // far from the rest of the graph and blow out the auto-fit view.
      .force("gravityX", forceX(WIDTH / 2).strength(0.045))
      .force("gravityY", forceY(HEIGHT / 2).strength(0.045))
      .force(
        "collide",
        forceCollide().radius((d: any) => nodeRadius(d.degree) + 10)
      )
      .stop();

    let i = 0;
    const totalTicks = 260;
    function step() {
      for (let k = 0; k < 4 && i < totalTicks; k++, i++) sim.tick();
      setNodes([...(nodeArr as GNode[])]);
      if (i < totalTicks) {
        requestAnimationFrame(step);
      } else {
        // Settled — fit the viewBox to wherever the physics actually put
        // the nodes so nothing ends up clipped outside the canvas.
        const xs = (nodeArr as GNode[]).map((n) => n.x!).filter((v) => Number.isFinite(v));
        const ys = (nodeArr as GNode[]).map((n) => n.y!).filter((v) => Number.isFinite(v));
        if (xs.length) {
          const pad = 46;
          const minX = Math.min(...xs) - pad;
          const maxX = Math.max(...xs) + pad;
          const minY = Math.min(...ys) - pad;
          const maxY = Math.max(...ys) + pad;
          setViewBox({ x: minX, y: minY, w: Math.max(240, maxX - minX), h: Math.max(180, maxY - minY) });
        }
      }
    }
    step();

    return () => {
      sim.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  async function selectNode(label: string, id: string) {
    const key = keyOf(label, id);
    setSelectedKey(key);
    setDetailLoading(true);
    setDetailError(null);
    try {
      const res = await fetch(`/api/ontology/graph/node?label=${encodeURIComponent(label)}&id=${encodeURIComponent(id)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load node");
      setDetail(json);
    } catch (err: any) {
      setDetailError(err.message);
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  function clearSelection() {
    setSelectedKey(null);
    setDetail(null);
    setDetailError(null);
  }

  function toggleLabel(label: string) {
    setHiddenLabels((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  // Which node keys are "in focus" — the selected node plus everything
  // directly connected to it, so the rest of the graph can fade back.
  const focusSet = useMemo(() => {
    if (!selectedKey) return null;
    const s = new Set<string>([selectedKey]);
    for (const l of linksRef.current) {
      if (l.source === selectedKey || (typeof l.source === "object" && (l.source as any).key === selectedKey)) {
        const t = typeof l.target === "object" ? (l.target as any).key : l.target;
        s.add(t);
      }
      if (l.target === selectedKey || (typeof l.target === "object" && (l.target as any).key === selectedKey)) {
        const f = typeof l.source === "object" ? (l.source as any).key : l.source;
        s.add(f);
      }
    }
    return s;
  }, [selectedKey, nodes]);

  function zoom(delta: number) {
    setView((v) => ({ ...v, k: Math.max(0.45, Math.min(2.6, v.k + delta)) }));
  }

  function resetView() {
    setView({ x: 0, y: 0, k: 1 });
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    zoom(e.deltaY < 0 ? 0.12 : -0.12);
  }

  function onMouseDown(e: React.MouseEvent) {
    dragState.current = { dragging: true, lastX: e.clientX, lastY: e.clientY };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragState.current.dragging) return;
    const dx = (e.clientX - dragState.current.lastX) / view.k;
    const dy = (e.clientY - dragState.current.lastY) / view.k;
    dragState.current.lastX = e.clientX;
    dragState.current.lastY = e.clientY;
    setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  }
  function endDrag() {
    dragState.current.dragging = false;
  }

  if (error) {
    return (
      <Box>
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This graph lives in a real Neo4j container dedicated to this project (<code>docker-compose.yml</code>). Start it, then reseed.
        </Typography>
        <Button variant="outlined" onClick={load}>
          Retry
        </Button>
      </Box>
    );
  }

  if (!data || nodes.length === 0) {
    return (
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 4 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">
          Laying out the graph…
        </Typography>
      </Stack>
    );
  }

  const byKey = new Map(nodes.map((n) => [n.key, n]));
  const presentLabels = Array.from(new Set(nodes.map((n) => n.label)));
  const labels = [...COLUMN_ORDER.filter((l) => presentLabels.includes(l)), ...presentLabels.filter((l) => !COLUMN_ORDER.includes(l)).sort()];
  const totalNodes = data.stats.nodeCounts.reduce((s: number, n: any) => s + n.count, 0);
  const totalRels = data.stats.relCounts.reduce((s: number, r: any) => s + r.count, 0);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" rowGap={1}>
        <Typography variant="body2" color="text.secondary">
          Live from the Neo4j container — {totalNodes} nodes, {totalRels} relationships. Showing {nodes.length} connected in this sample.
        </Typography>
        <Button size="small" variant="outlined" onClick={seed} disabled={seeding}>
          {seeding ? <CircularProgress size={16} /> : "Reseed from MySQL"}
        </Button>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
        {labels.map((l) => (
          <Chip
            key={l}
            size="small"
            label={l}
            onClick={() => toggleLabel(l)}
            sx={{
              bgcolor: colorForLabel(l, palette),
              color: "#fff",
              cursor: "pointer",
              opacity: hiddenLabels.has(l) ? 0.35 : 1,
              textDecoration: hiddenLabels.has(l) ? "line-through" : "none",
            }}
          />
        ))}
        <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center", ml: 0.5 }}>
          Click a type to dim it · click a node for its full connection list
        </Typography>
      </Stack>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems="flex-start">
        <Box sx={{ position: "relative", flex: 1, minWidth: 0, border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
          <Stack sx={{ position: "absolute", top: 8, right: 8, zIndex: 2 }} spacing={0.5}>
            <IconButton size="small" onClick={() => zoom(0.2)} sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
              <AddRoundedIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => zoom(-0.2)} sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
              <RemoveRoundedIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={resetView} sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
              <CenterFocusStrongRoundedIcon fontSize="small" />
            </IconButton>
          </Stack>

          <svg
            width="100%"
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
            style={{
              display: "block",
              width: "100%",
              height: 560,
              cursor: dragState.current.dragging ? "grabbing" : "grab",
              background: theme.palette.mode === "dark" ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.012)",
            }}
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
          >
            {(() => {
              const ccx = viewBox.x + viewBox.w / 2;
              const ccy = viewBox.y + viewBox.h / 2;
              return (
                <g transform={`translate(${ccx},${ccy}) scale(${view.k}) translate(${-ccx + view.x},${-ccy + view.y})`}>
              {linksRef.current.map((l, i) => {
                const s = byKey.get(l.source as any) || byKey.get((l.source as any).key);
                const t = byKey.get(l.target as any) || byKey.get((l.target as any).key);
                if (!s || !t || s.x == null || t.x == null) return null;
                if (hiddenLabels.has(s.label) || hiddenLabels.has(t.label)) return null;
                const inFocus = !focusSet || (focusSet.has(s.key) && focusSet.has(t.key));
                const touchesSelection = selectedKey && (s.key === selectedKey || t.key === selectedKey);
                const mx = (s.x! + t.x!) / 2;
                const my = (s.y! + t.y!) / 2;
                return (
                  <g key={i}>
                    <line
                      x1={s.x}
                      y1={s.y}
                      x2={t.x}
                      y2={t.y}
                      stroke={touchesSelection ? theme.palette.primary.main : theme.palette.divider}
                      strokeWidth={touchesSelection ? 1.75 : 1}
                      opacity={inFocus ? (touchesSelection ? 0.9 : 0.45) : 0.06}
                      onMouseEnter={() => setHoverEdge({ x: mx, y: my, label: l.relType, from: s.name, to: t.name })}
                      onMouseLeave={() => setHoverEdge(null)}
                      style={{ cursor: "pointer" }}
                    />
                    {touchesSelection && (
                      <text x={mx} y={my - 4} textAnchor="middle" fontSize={9} fill={theme.palette.primary.main} fontWeight={700} style={{ pointerEvents: "none" }}>
                        {l.relType.replace(/_/g, " ").toLowerCase()}
                      </text>
                    )}
                  </g>
                );
              })}

              {nodes.map((n) => {
                if (n.x == null || n.y == null) return null;
                if (hiddenLabels.has(n.label)) return null;
                const inFocus = !focusSet || focusSet.has(n.key);
                const isSelected = n.key === selectedKey;
                const r = nodeRadius(n.degree);
                return (
                  <g
                    key={n.key}
                    onMouseEnter={() => setHoverNode(n.key)}
                    onMouseLeave={() => setHoverNode(null)}
                    onClick={() => selectNode(n.label, n.id)}
                    style={{ cursor: "pointer" }}
                    opacity={inFocus ? 1 : 0.15}
                  >
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={r}
                      fill={colorForLabel(n.label, palette)}
                      stroke={isSelected ? theme.palette.text.primary : "none"}
                      strokeWidth={isSelected ? 2.5 : 0}
                    />
                    {(hoverNode === n.key || isSelected || r > 9) && (
                      <text
                        x={n.x}
                        y={n.y! - r - 5}
                        textAnchor="middle"
                        fontSize={10.5}
                        fontWeight={isSelected ? 700 : 500}
                        fill={theme.palette.text.primary}
                        style={{ pointerEvents: "none" }}
                      >
                        {n.name.length > 22 ? n.name.slice(0, 21) + "…" : n.name}
                      </text>
                    )}
                  </g>
                );
              })}
                </g>
              );
            })()}
          </svg>

          {hoverEdge && (
            <Box
              sx={{
                position: "absolute",
                left: 10,
                bottom: 10,
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                px: 1.25,
                py: 0.75,
                boxShadow: 3,
                pointerEvents: "none",
                maxWidth: 320,
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                {hoverEdge.from} → {hoverEdge.to}
              </Typography>
              <Typography variant="body2" fontWeight={700}>
                {hoverEdge.label}
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ width: { xs: "100%", lg: 320 }, flexShrink: 0 }}>
          {!detail && !detailLoading && (
            <Box sx={{ p: 2.5, border: "1px dashed", borderColor: "divider", borderRadius: 2, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Click any node to see its full record and every relationship it has — pulled live from Neo4j.
              </Typography>
            </Box>
          )}
          {detailLoading && (
            <Box sx={{ p: 2.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              <CircularProgress size={18} />
            </Box>
          )}
          {detailError && (
            <Alert severity="warning" onClose={clearSelection}>
              {detailError}
            </Alert>
          )}
          {detail && !detailLoading && (
            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                <Box>
                  <Chip size="small" label={detail.center.label} sx={{ bgcolor: colorForLabel(detail.center.label, palette), color: "#fff", mb: 0.75 }} />
                  <Typography variant="subtitle1" sx={{ lineHeight: 1.2 }}>
                    {detail.center.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ID: {detail.center.id}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={clearSelection}>
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>
                Connections ({detail.neighbors.length})
              </Typography>
              <Stack spacing={0.75} sx={{ mt: 1, maxHeight: 380, overflowY: "auto" }}>
                {detail.neighbors.map((n, i) => (
                  <Stack
                    key={i}
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    onClick={() => selectNode(n.label, n.id)}
                    sx={{
                      p: 0.75,
                      borderRadius: 1.5,
                      cursor: "pointer",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: colorForLabel(n.label, palette), flexShrink: 0 }} />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" noWrap fontWeight={600}>
                        {n.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {n.outgoing ? "→" : "←"} {n.relType.replace(/_/g, " ").toLowerCase()} · {n.label}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
                {detail.neighbors.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No relationships found for this record.
                  </Typography>
                )}
              </Stack>
            </Box>
          )}
        </Box>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
        Drag to pan, scroll to zoom. Selecting a node highlights exactly how it connects to the rest of the graph.
      </Typography>
    </Box>
  );
}
