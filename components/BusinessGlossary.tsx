"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Box,
} from "@mui/material";

type GlossaryRow = {
  term: string;
  definition: string;
  business_rule: string;
  source_system: string | null;
  metric_name: string | null;
};

export default function BusinessGlossary() {
  const [rows, setRows] = useState<GlossaryRow[] | null>(null);

  useEffect(() => {
    fetch("/api/glossary")
      .then((r) => r.json())
      .then((d) => setRows(d.rows || []));
  }, []);

  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Term</TableCell>
                <TableCell>Definition</TableCell>
                <TableCell>Business rule</TableCell>
                <TableCell>Source</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(rows || []).map((r) => (
                <TableRow key={r.term} hover>
                  <TableCell>
                    <strong>{r.term}</strong>
                  </TableCell>
                  <TableCell>{r.definition}</TableCell>
                  <TableCell>{r.business_rule}</TableCell>
                  <TableCell>{r.source_system || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </CardContent>
    </Card>
  );
}
