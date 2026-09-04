"use client";

import { useState } from "react";
import { Card, Stack, Select, MenuItem, Typography, Button, Chip } from "@mui/material";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";

type FilterDef = { key: string; label: string; options: string[] };

const DEFAULT_FILTERS: FilterDef[] = [
  { key: "period", label: "Period", options: ["Jan – Feb 2026", "Jan 2026", "Feb 2026", "Trailing 12 months"] },
  { key: "businessUnit", label: "Business Unit", options: ["All business units", "Fertilisers", "Industrial Chemicals", "TAN & Mining Chemicals"] },
  { key: "plant", label: "Plant", options: ["All plants", "Taloja", "Dahej", "Ekalahare", "Ennore"] },
  { key: "region", label: "Region", options: ["All regions", "West", "North", "South", "East"] },
  { key: "product", label: "Product / Segment", options: ["All products", "Nitric Acid", "Isopropyl Alcohol", "Ammonium Nitrate", "Weak Nitric Acid"] },
];

export default function FilterBar({ filters = DEFAULT_FILTERS }: { filters?: FilterDef[] }) {
  const defaults = () => Object.fromEntries(filters.map((f) => [f.key, f.options[0]]));
  const [values, setValues] = useState<Record<string, string>>(defaults);
  const [applied, setApplied] = useState<Record<string, string>>(defaults);

  const dirty = filters.some((f) => values[f.key] !== applied[f.key]);
  const activeChips = filters.filter((f) => applied[f.key] !== f.options[0]);

  function reset() {
    const d = defaults();
    setValues(d);
    setApplied(d);
  }

  function clearOne(key: string) {
    setValues((v) => ({ ...v, [key]: filters.find((f) => f.key === key)!.options[0] }));
    setApplied((v) => ({ ...v, [key]: filters.find((f) => f.key === key)!.options[0] }));
  }

  return (
    <Card variant="outlined" sx={{ mb: 3, px: 2, py: 1.5 }}>
      <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} alignItems={{ lg: "center" }}>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: "text.secondary", flexShrink: 0 }}>
          <TuneRoundedIcon sx={{ fontSize: 18 }} />
          <Typography variant="body2" fontWeight={650}>
            Filters
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap sx={{ flex: 1 }}>
          {filters.map((f) => (
            <Select
              key={f.key}
              size="small"
              value={values[f.key]}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              sx={{ minWidth: 150, fontSize: 13.5 }}
            >
              {f.options.map((o) => (
                <MenuItem key={o} value={o} sx={{ fontSize: 13.5 }}>
                  {o}
                </MenuItem>
              ))}
            </Select>
          ))}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Button size="small" variant="contained" disabled={!dirty} onClick={() => setApplied(values)}>
            Apply
          </Button>
          <Button size="small" variant="text" onClick={reset} disabled={!activeChips.length && !dirty}>
            Reset
          </Button>
        </Stack>
      </Stack>

      {activeChips.length > 0 && (
        <Stack direction="row" spacing={0.75} sx={{ mt: 1.25 }} flexWrap="wrap" useFlexGap alignItems="center">
          <Typography variant="caption" color="text.secondary">
            Active:
          </Typography>
          {activeChips.map((f) => (
            <Chip key={f.key} size="small" label={`${f.label}: ${applied[f.key]}`} onDelete={() => clearOne(f.key)} />
          ))}
        </Stack>
      )}
    </Card>
  );
}
