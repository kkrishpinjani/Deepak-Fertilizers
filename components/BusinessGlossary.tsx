"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, Typography, Box, Grid, TextField, InputAdornment, Chip, Stack, CircularProgress, useTheme } from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { glow } from "./theme";

type GlossaryRow = {
  term: string;
  definition: string;
  business_rule: string;
  source_system: string | null;
  metric_name: string | null;
};

export default function BusinessGlossary() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [rows, setRows] = useState<GlossaryRow[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/glossary")
      .then((r) => r.json())
      .then((d) => setRows(d.rows || []));
  }, []);

  if (!rows) {
    return <CircularProgress size={20} />;
  }

  const q = query.trim().toLowerCase();
  const filtered = rows.filter(
    (r) => !q || r.term.toLowerCase().includes(q) || r.definition.toLowerCase().includes(q) || (r.metric_name || "").toLowerCase().includes(q)
  );

  return (
    <Box>
      <TextField
        fullWidth
        placeholder="Search a term — e.g. EBITDA, working capital, attainment…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{
          mb: 3,
          maxWidth: 480,
          "& .MuiOutlinedInput-root": {
            transition: "box-shadow 160ms ease, border-color 160ms ease",
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": isDark
              ? { borderColor: "primary.main" }
              : undefined,
            "&.Mui-focused": isDark ? { boxShadow: glow.accentShadow } : undefined,
          },
        }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" sx={{ color: "text.secondary" }} /></InputAdornment> }}
      />

      {filtered.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No terms match &ldquo;{query}&rdquo;.
        </Typography>
      )}

      <Grid container spacing={2}>
        {filtered.map((r) => (
          <Grid item xs={12} md={6} key={r.term}>
            <Card
              variant="outlined"
              sx={{
                height: "100%",
                transition: "border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
                "&:hover": {
                  borderColor: isDark ? "rgba(90,169,255,0.35)" : "primary.main",
                  boxShadow: isDark ? glow.accentShadow : undefined,
                  transform: "translateY(-1px)",
                },
              }}
            >
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 0.75 }}>
                  <Typography variant="subtitle1">{r.term}</Typography>
                  {r.source_system && <Chip size="small" variant="outlined" label={r.source_system} />}
                </Stack>
                <Typography variant="body2" sx={{ mb: r.business_rule ? 1.25 : 0 }}>
                  {r.definition}
                </Typography>
                {r.business_rule && (
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>
                      Business rule
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontFamily: "monospace", fontSize: 12.5 }}>
                      {r.business_rule}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
