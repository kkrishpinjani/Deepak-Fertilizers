"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, Stack, Select, MenuItem, Typography, Button, Chip, Box, useTheme } from "@mui/material";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import { glow } from "./theme";

export type FilterDef = { key: string; label: string; options: string[] };

const ALL = "All";

export default function FilterBar({ filters }: { filters: FilterDef[] }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const fromUrl = () =>
    Object.fromEntries(filters.map((f) => [f.key, searchParams.get(f.key) || ALL]));

  const [values, setValues] = useState<Record<string, string>>(fromUrl);
  const [applied, setApplied] = useState<Record<string, string>>(fromUrl);

  // Keep in sync if the URL changes from elsewhere (back/forward nav).
  useEffect(() => {
    const next = fromUrl();
    setValues(next);
    setApplied(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const dirty = filters.some((f) => values[f.key] !== applied[f.key]);
  const activeChips = filters.filter((f) => applied[f.key] !== ALL);

  function pushParams(next: Record<string, string>) {
    const params = new URLSearchParams();
    filters.forEach((f) => {
      if (next[f.key] && next[f.key] !== ALL) params.set(f.key, next[f.key]);
    });
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function apply() {
    setApplied(values);
    pushParams(values);
  }

  function reset() {
    const cleared = Object.fromEntries(filters.map((f) => [f.key, ALL]));
    setValues(cleared);
    setApplied(cleared);
    pushParams(cleared);
  }

  function clearOne(key: string) {
    const next = { ...applied, [key]: ALL };
    setValues(next);
    setApplied(next);
    pushParams(next);
  }

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 3,
        px: 2,
        py: 1.5,
        position: "relative",
        overflow: "hidden",
        ...(isDark && {
          backgroundImage: `linear-gradient(180deg, rgba(148,163,220,0.06), rgba(148,163,220,0.015)), ${glow.heroBackground}`,
        }),
      }}
    >
      <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} alignItems={{ lg: "center" }}>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: "text.secondary", flexShrink: 0 }}>
          <Box
            sx={{
              width: 26,
              height: 26,
              borderRadius: "7px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: isDark ? "rgba(90,169,255,0.12)" : "rgba(42,95,176,0.07)",
              color: "primary.main",
              flexShrink: 0,
            }}
          >
            <TuneRoundedIcon sx={{ fontSize: 16 }} />
          </Box>
          <Typography variant="body2" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 0.5, fontSize: 12 }}>
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
              sx={{
                minWidth: 150,
                fontSize: 13.5,
                transition: "border-color 160ms ease, box-shadow 160ms ease",
                bgcolor: isDark ? "rgba(148,163,220,0.04)" : "transparent",
                "&:hover": {
                  boxShadow: isDark ? "0 0 0 1px rgba(90,169,255,0.25)" : "none",
                },
              }}
            >
              <MenuItem value={ALL} sx={{ fontSize: 13.5 }}>
                {`All ${f.label.toLowerCase()}s`}
              </MenuItem>
              {f.options.map((o) => (
                <MenuItem key={o} value={o} sx={{ fontSize: 13.5 }}>
                  {o}
                </MenuItem>
              ))}
            </Select>
          ))}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Button size="small" variant="contained" disabled={!dirty} onClick={apply}>
            Apply
          </Button>
          <Button size="small" variant="text" onClick={reset} disabled={!activeChips.length && !dirty}>
            Reset
          </Button>
        </Stack>
      </Stack>

      {activeChips.length > 0 && (
        <Stack direction="row" spacing={0.75} sx={{ mt: 1.25, pt: 1.25, borderTop: "1px solid", borderColor: "divider" }} flexWrap="wrap" useFlexGap alignItems="center">
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 650 }}>
            Active:
          </Typography>
          {activeChips.map((f) => (
            <Chip
              key={f.key}
              size="small"
              label={`${f.label}: ${applied[f.key]}`}
              onDelete={() => clearOne(f.key)}
              sx={{
                bgcolor: isDark ? "rgba(90,169,255,0.12)" : "rgba(42,95,176,0.07)",
                border: isDark ? "1px solid rgba(90,169,255,0.28)" : "1px solid rgba(42,95,176,0.18)",
                color: isDark ? "primary.light" : "primary.dark",
              }}
            />
          ))}
        </Stack>
      )}
    </Card>
  );
}
