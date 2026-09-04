"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
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
  Divider,
} from "@mui/material";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";

type UploadedFile = { name: string; csv: string };

export default function OntologyUploader() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [batch, setBatch] = useState<any>(null);
  const [committing, setCommitting] = useState(false);
  const [committed, setCommitted] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    const res = await fetch("/api/ontology/ingested");
    setHistory(await res.json());
  }

  async function onFilesSelected(fileList: FileList | null) {
    if (!fileList?.length) return;
    const read = await Promise.all(
      Array.from(fileList).map(
        (f) =>
          new Promise<UploadedFile>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ name: f.name.replace(/\.csv$/i, ""), csv: String(reader.result) });
            reader.readAsText(f);
          })
      )
    );
    setFiles(read);
    setBatch(null);
    setCommitted(null);
    setError(null);
  }

  async function profile() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ontology/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Profiling failed");
      setBatch(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function approveAndCommit() {
    setCommitting(true);
    setError(null);
    try {
      const res = await fetch("/api/ontology/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files, relationships: batch.relationships }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Commit failed");
      setCommitted(data);
      loadHistory();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCommitting(false);
    }
  }

  return (
    <Stack spacing={3}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload one or more CSVs (SAP extracts, Anaplan exports, anything
            else). This profiles the schema, infers business entities and
            candidate keys, proposes relationships — including across the
            files uploaded together — and shows you all of it before
            anything is written. Nothing lands in the database until you
            press Approve &amp; Commit.
          </Typography>

          <Button component="label" variant="outlined" startIcon={<UploadFileRoundedIcon />}>
            Choose CSV files
            <input type="file" accept=".csv" multiple hidden onChange={(e) => onFilesSelected(e.target.files)} />
          </Button>

          {files.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
              {files.map((f) => (
                <Chip key={f.name} label={f.name} size="small" />
              ))}
              <Button size="small" variant="contained" onClick={profile} disabled={loading}>
                {loading ? <CircularProgress size={16} color="inherit" /> : "Profile"}
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}

      {batch && !committed && (
        <>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontSize: 16 }} gutterBottom>
                Schema profile
              </Typography>
              {batch.tables.map((t: any) => (
                <Box key={t.name} sx={{ mb: 2 }}>
                  <Typography variant="subtitle1">{t.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {t.profile.rows} rows · candidate key: <strong>{t.profile.primaryKey || "none found"}</strong> · entities:{" "}
                    {t.profile.entities.join(", ") || "none matched"}
                  </Typography>
                  <Box sx={{ overflowX: "auto" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Column</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Unique %</TableCell>
                          <TableCell>Null %</TableCell>
                          <TableCell>Entity match</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {t.profile.columns.map((c: any) => (
                          <TableRow key={c.name}>
                            <TableCell>{c.name}</TableCell>
                            <TableCell>{c.inferredType}</TableCell>
                            <TableCell>{(c.uniqueRate * 100).toFixed(0)}%</TableCell>
                            <TableCell>{(c.nullRate * 100).toFixed(0)}%</TableCell>
                            <TableCell>{c.entityHints.join(", ") || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontSize: 16 }} gutterBottom>
                Proposed relationships ({batch.relationships.length})
              </Typography>
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>From</TableCell>
                      <TableCell>To</TableCell>
                      <TableCell>Entity</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Confidence</TableCell>
                      <TableCell>Reason</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {batch.relationships.map((r: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell>{r.fromTable}.{r.fromColumn}</TableCell>
                        <TableCell>{r.toTable}{r.toColumn ? `.${r.toColumn}` : ""}</TableCell>
                        <TableCell>{r.toEntity}</TableCell>
                        <TableCell>{r.relationship}</TableCell>
                        <TableCell>{(r.confidence * 100).toFixed(0)}%</TableCell>
                        <TableCell>{r.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>

              <Divider sx={{ my: 2 }} />
              <Button variant="contained" color="success" onClick={approveAndCommit} disabled={committing}>
                {committing ? <CircularProgress size={16} color="inherit" /> : "Approve & Commit"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {committed && (
        <Alert severity="success" icon={<CheckCircleRoundedIcon />}>
          <Typography variant="body2">
            Committed {committed.committed.length} table(s) to the <code>uploads</code> MySQL database:{" "}
            {committed.committed.map((c: any) => `${c.table} (${c.rowsLoaded} rows, ${c.mappingsRecorded} mappings)`).join("; ")}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Neo4j:{" "}
            {committed.committed
              .map((c: any) =>
                c.neo4j?.committed
                  ? `${c.file} → ${c.neo4j.entitiesLinked} entity type(s) MERGEd`
                  : `${c.file} skipped (${c.neo4j?.reason || "unknown"})`
              )
              .join("; ")}
          </Typography>
        </Alert>
      )}

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Previously ingested
          </Typography>
          {!history?.tables?.length && (
            <Typography variant="body2" color="text.secondary">
              Nothing ingested yet.
            </Typography>
          )}
          {history?.tables?.length > 0 && (
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Table</TableCell>
                    <TableCell>Rows</TableCell>
                    <TableCell>Primary key</TableCell>
                    <TableCell>Entities</TableCell>
                    <TableCell>Ingested</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.tables.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell>uploads.{t.table_name}</TableCell>
                      <TableCell>{t.row_count}</TableCell>
                      <TableCell>{t.primary_key || "—"}</TableCell>
                      <TableCell>{t.entities}</TableCell>
                      <TableCell>{new Date(t.ingested_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
