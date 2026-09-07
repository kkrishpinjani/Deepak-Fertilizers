"use client";

import { createTheme } from "@mui/material/styles";
import type { PaletteMode } from "@mui/material";

// Design tokens — "enterprise intelligence command center" for Primesemonto
// Finance Intelligence. Deep navy/near-black canvas with electric
// blue/purple/cyan accents used sparingly for hierarchy, not decoration.
// Green/red stay reserved for variance only; everything else is told in
// words (StatusBadge always pairs icon + label). Source Serif 4 for
// headlines, IBM Plex Sans for UI and numbers. Light mode keeps the same
// structure with a calmer, paper-based surface treatment.
export function getTheme(mode: PaletteMode) {
  const isDark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: { main: isDark ? "#5aa9ff" : "#2a5fb0", contrastText: "#ffffff" },
      secondary: { main: isDark ? "#a78bfa" : "#6a5acd" },
      success: { main: isDark ? "#4ade80" : "#1a7a43" },
      warning: { main: isDark ? "#fbbf24" : "#a15c00" },
      error: { main: isDark ? "#f87171" : "#c22a2a" },
      info: { main: isDark ? "#67e8f9" : "#0f6fa8" },
      background: {
        default: isDark ? "#070911" : "#f6f5f0",
        paper: isDark ? "#0f1320" : "#ffffff",
      },
      divider: isDark ? "rgba(148,163,220,0.14)" : "rgba(23,26,31,0.09)",
      text: {
        primary: isDark ? "#eef1fb" : "#14171c",
        secondary: isDark ? "#93a0c2" : "#5c6270",
      },
      action: {
        hover: isDark ? "rgba(148,163,220,0.07)" : "rgba(23,26,31,0.035)",
        selected: isDark ? "rgba(90,169,255,0.16)" : "rgba(42,95,176,0.08)",
      },
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: "var(--font-sans), 'IBM Plex Sans', 'Segoe UI', Arial, sans-serif",
      h1: { fontFamily: "var(--font-serif), Georgia, serif", fontWeight: 600 },
      h2: { fontFamily: "var(--font-serif), Georgia, serif", fontWeight: 600 },
      h3: { fontFamily: "var(--font-serif), Georgia, serif", fontWeight: 600, letterSpacing: -0.3 },
      h4: {
        fontFamily: "var(--font-serif), Georgia, serif",
        fontWeight: 600,
        letterSpacing: -0.3,
        fontSize: "1.85rem",
      },
      h5: { fontWeight: 700, letterSpacing: -0.1 },
      h6: { fontWeight: 700, letterSpacing: -0.1 },
      subtitle1: { fontWeight: 650 },
      subtitle2: { fontWeight: 650 },
      body1: { fontSize: "0.975rem", lineHeight: 1.55 },
      body2: { fontSize: "0.875rem", lineHeight: 1.5 },
      overline: { fontWeight: 700, letterSpacing: 1.1, fontSize: "0.7rem" },
      button: { fontWeight: 650, textTransform: "none" },
      caption: { fontSize: "0.75rem" },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: isDark
            ? {
                backgroundColor: "#070911",
                backgroundImage:
                  "radial-gradient(1100px 640px at 12% -8%, rgba(90,169,255,0.10), transparent 60%)," +
                  "radial-gradient(900px 560px at 100% 0%, rgba(167,139,250,0.08), transparent 55%)",
                backgroundAttachment: "fixed",
              }
            : undefined,
          "::selection": { background: isDark ? "rgba(90,169,255,0.35)" : "rgba(42,95,176,0.2)" },
          "*": {
            scrollbarWidth: "thin",
            scrollbarColor: isDark ? "rgba(148,163,220,0.25) transparent" : "rgba(23,26,31,0.22) transparent",
          },
          "*::-webkit-scrollbar": { width: 8, height: 8 },
          "*::-webkit-scrollbar-track": { background: "transparent" },
          "*::-webkit-scrollbar-thumb": {
            backgroundColor: isDark ? "rgba(148,163,220,0.25)" : "rgba(23,26,31,0.22)",
            borderRadius: 8,
          },
          "*::-webkit-scrollbar-thumb:hover": {
            backgroundColor: isDark ? "rgba(148,163,220,0.4)" : "rgba(23,26,31,0.35)",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: isDark
              ? "linear-gradient(180deg, rgba(148,163,220,0.05), rgba(148,163,220,0.015))"
              : "none",
            backgroundColor: isDark ? "rgba(17,21,36,0.72)" : undefined,
            backdropFilter: isDark ? "blur(14px)" : undefined,
            border: `1px solid ${isDark ? "rgba(148,163,220,0.14)" : "rgba(23,26,31,0.09)"}`,
            boxShadow: isDark
              ? "0 1px 0 rgba(255,255,255,0.04) inset, 0 12px 32px rgba(2,4,12,0.45)"
              : "0 1px 2px rgba(16,24,40,0.03), 0 1px 3px rgba(16,24,40,0.05)",
            transition: "border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
          },
        },
      },
      MuiCardContent: {
        styleOverrides: { root: { padding: 20, "&:last-child": { paddingBottom: 20 } } },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 10, paddingLeft: 14, paddingRight: 14 },
          contained: {
            boxShadow: "none",
            "&:hover": { boxShadow: isDark ? "0 0 0 1px rgba(90,169,255,0.4), 0 8px 24px rgba(90,169,255,0.25)" : "none" },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 650, borderRadius: 7 },
          label: { paddingLeft: 9, paddingRight: 9 },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: isDark ? "rgba(148,163,220,0.10)" : "rgba(23,26,31,0.07)" },
          head: {
            fontWeight: 700,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            color: isDark ? "#8fa0c9" : "#697082",
            backgroundColor: isDark ? "rgba(15,19,32,0.9)" : "#ffffff",
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: isDark ? "rgba(20,24,40,0.95)" : "#1c1e24",
            backgroundImage: "none",
            border: isDark ? "1px solid rgba(148,163,220,0.18)" : "none",
            fontSize: 12,
            borderRadius: 8,
            padding: "6px 10px",
          },
        },
      },
      MuiDivider: {
        styleOverrides: { root: { borderColor: isDark ? "rgba(148,163,220,0.14)" : "rgba(23,26,31,0.09)" } },
      },
      MuiLinearProgress: {
        styleOverrides: { root: { backgroundColor: isDark ? "rgba(148,163,220,0.12)" : "rgba(23,26,31,0.07)" } },
      },
    },
  });
}

export default getTheme;

// Shared numeric/chart tokens that live outside the MUI palette (used by
// components that need a value regardless of theme, e.g. inline hex for the
// "ghost" plan bar, or ambient glow accents on the command-center surfaces).
export const chartTokens = {
  planFillLight: "rgba(23,26,31,0.10)",
  planFillDark: "rgba(148,163,220,0.12)",
  planStrokeLight: "rgba(23,26,31,0.38)",
  planStrokeDark: "rgba(148,163,220,0.5)",
};

// Ambient glow/gradient tokens for hero and command-center surfaces (dark
// mode only — light mode stays flat/paper). Used sparingly: hero panels,
// investigation pipeline, ontology graph — never behind dense tables.
export const glow = {
  heroBackground:
    "radial-gradient(900px 420px at 15% 0%, rgba(90,169,255,0.16), transparent 60%)," +
    "radial-gradient(700px 380px at 90% 10%, rgba(167,139,250,0.14), transparent 55%)",
  accentBorder: "1px solid rgba(90,169,255,0.35)",
  accentShadow: "0 0 0 1px rgba(90,169,255,0.25), 0 8px 28px rgba(90,169,255,0.16)",
  cyanShadow: "0 0 0 1px rgba(103,232,249,0.25), 0 8px 28px rgba(103,232,249,0.14)",
};
