"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  TextField,
  Stack,
  CircularProgress,
  Button,
  Alert,
  useTheme,
} from "@mui/material";
import StatusBadge from "./StatusBadge";
import { glow } from "./theme";

export default function SourceCatalog() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState(0);
  const [filter, setFilter] = useState("");
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphResult, setGraphResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then(setData);
  }, []);

  async function loadIntoGraph() {
    setGraphLoading(true);
    setGraphResult(null);
    try {
      const res = await fetch("/api/catalog/graph", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load into Neo4j");
      const s = json.stats;
      setGraphResult({
        ok: true,
        message: `Loaded ${s.CatalogSourceTable} source tables, ${s.CatalogEntity} entities, ${s.CATALOG_RELATIONSHIP} relationships into Neo4j.`,
      });
    } catch (err: any) {
      setGraphResult({ ok: false, message: err.message });
    } finally {
      setGraphLoading(false);
    }
  }

  if (!data) return <CircularProgress size={20} />;

  const q = filter.toLowerCase();
  const tables = data.tables.filter(
    (t: any) => !q || t.code.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.domain.toLowerCase().includes(q)
  );
  const sapTables = tables.filter((t: any) => t.source_system === "SAP");
  const anaplanTables = tables.filter((t: any) => t.source_system === "ANAPLAN");
  const entities = data.entities.filter((e: any) => !q || e.entity.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
  const relationships = data.relationships.filter(
    (r: any) => !q || r.from_entity.toLowerCase().includes(q) || r.to_entity.toLowerCase().includes(q) || r.relationship.toLowerCase().includes(q)
  );

  const rowHoverSx = {
    "&:hover": {
      bgcolor: isDark ? "rgba(90,169,255,0.06)" : "action.hover",
    },
  };

  const counts = [
    [`SAP tables (${sapTables.filter((t: any) => t.implemented).length}/${sapTables.length} built)`, sapTables],
    [`Anaplan objects (${anaplanTables.filter((t: any) => t.implemented).length}/${anaplanTables.length} built)`, anaplanTables],
    [`Ontology entities (${entities.filter((e: any) => e.implemented).length}/${entities.length} built)`, entities],
    [`Relationships (${relationships.filter((r: any) => r.implemented).length}/${relationships.length} built)`, relationships],
  ] as const;

  // Totals for the intro paragraph — derived from the fetched catalog, not
  // hand-typed, so they never drift from the tab counts below.
  const allSapCount = data.tables.filter((t: any) => t.source_system === "SAP").length;
  const allAnaplanCount = data.tables.filter((t: any) => t.source_system === "ANAPLAN").length;
  const allEntityCount = data.entities.length;
  const allRelationshipCount = data.relationships.length;

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The reference source-table catalog an enterprise rollout of this
          project would need to cover — {allSapCount} candidate S/4HANA
          tables, {allAnaplanCount} Anaplan platform/planning objects,{" "}
          {allEntityCount} canonical business entities, {allRelationshipCount}{" "}
          relationships between them. Rows marked <strong>Built</strong>{" "}
          have a real table or view in this project; everything else is
          catalogued for reference but not implemented.
        </Typography>

        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
          <TextField
            size="small"
            placeholder="Filter…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            sx={{
              width: 280,
              "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": isDark
                ? { borderColor: "primary.main", boxShadow: glow.accentShadow }
                : undefined,
            }}
          />
          <Button size="small" variant="outlined" onClick={loadIntoGraph} disabled={graphLoading}>
            {graphLoading ? <CircularProgress size={16} /> : "Load full catalog into Neo4j graph"}
          </Button>
          <Button size="small" variant="outlined" component="a" href="/api/semantic-view" target="_blank" rel="noopener">
            View Snowflake semantic model YAML
          </Button>
        </Stack>

        {graphResult && (
          <Alert severity={graphResult.ok ? "success" : "warning"} sx={{ mb: 2 }}>
            {graphResult.message}
          </Alert>
        )}

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          sx={{
            mb: 2,
            minHeight: 40,
            borderBottom: "1px solid",
            borderColor: "divider",
            "& .MuiTab-root": {
              minHeight: 40,
              textTransform: "none",
              fontWeight: 650,
              fontSize: "0.85rem",
              color: "text.secondary",
              "&.Mui-selected": { color: isDark ? "primary.light" : "primary.main" },
            },
            "& .MuiTabs-indicator": {
              height: 2.5,
              borderRadius: 2,
              boxShadow: isDark ? `0 0 8px ${theme.palette.primary.main}` : "none",
            },
          }}
        >
          {counts.map(([label]) => (
            <Tab key={label} label={label} />
          ))}
        </Tabs>

        {tab < 2 && (
          <Box sx={{ overflowX: "auto", maxHeight: 480, overflowY: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Domain</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(counts[tab][1] as any[]).map((t: any) => (
                  <TableRow key={t.code} hover sx={rowHoverSx}>
                    <TableCell>
                      <code>{t.code}</code>
                    </TableCell>
                    <TableCell>{t.description}</TableCell>
                    <TableCell>{t.domain}</TableCell>
                    <TableCell>
                      {t.implemented ? (
                        <StatusBadge tone="positive" label={t.implemented_as || "Built"} size="small" pill />
                      ) : (
                        <StatusBadge tone="neutral" label="Not yet built" size="small" pill />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        {tab === 2 && (
          <Box sx={{ overflowX: "auto", maxHeight: 480, overflowY: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Entity</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entities.map((e: any) => (
                  <TableRow key={e.entity} hover sx={rowHoverSx}>
                    <TableCell>{e.entity}</TableCell>
                    <TableCell>{e.description}</TableCell>
                    <TableCell>{e.source}</TableCell>
                    <TableCell>
                      {e.implemented ? (
                        <StatusBadge tone="positive" label={e.implemented_as || "Built"} size="small" pill />
                      ) : (
                        <StatusBadge tone="neutral" label="Not yet built" size="small" pill />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        {tab === 3 && (
          <Box sx={{ overflowX: "auto", maxHeight: 480, overflowY: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>From</TableCell>
                  <TableCell>Relationship</TableCell>
                  <TableCell>To</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {relationships.map((r: any, i: number) => (
                  <TableRow key={i} hover sx={rowHoverSx}>
                    <TableCell>{r.from_entity}</TableCell>
                    <TableCell>
                      <code>{r.relationship}</code>
                    </TableCell>
                    <TableCell>{r.to_entity}</TableCell>
                    <TableCell>
                      {r.implemented ? (
                        <StatusBadge tone="positive" label="Built" size="small" pill />
                      ) : (
                        <StatusBadge tone="neutral" label="Not yet built" size="small" pill />
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
