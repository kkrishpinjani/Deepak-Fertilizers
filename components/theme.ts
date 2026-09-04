"use client";

import { createTheme } from "@mui/material/styles";
import type { PaletteMode } from "@mui/material";

// Design tokens — see MEMORY / design canvas: warm off-white (light) or deep
// navy-charcoal (dark) canvas, a single blue accent that always means
// "actual", green/red reserved for variance only, everything else told in
// words. Source Serif 4 for headlines, IBM Plex Sans for UI and numbers.
export function getTheme(mode: PaletteMode) {
  const isDark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: { main: isDark ? "#4f96eb" : "#2a5fb0", contrastText: "#ffffff" },
      secondary: { main: isDark ? "#8b7ff0" : "#6a5acd" },
      success: { main: isDark ? "#4ade80" : "#1a7a43" },
      warning: { main: isDark ? "#fbbf24" : "#a15c00" },
      error: { main: isDark ? "#f87171" : "#c22a2a" },
      info: { main: isDark ? "#5eb3e8" : "#0f6fa8" },
      background: {
        default: isDark ? "#0d0f14" : "#f6f5f0",
        paper: isDark ? "#151822" : "#ffffff",
      },
      divider: isDark ? "rgba(255,255,255,0.08)" : "rgba(23,26,31,0.09)",
      text: {
        primary: isDark ? "#e9ecf3" : "#14171c",
        secondary: isDark ? "#98a2b8" : "#5c6270",
      },
      action: {
        hover: isDark ? "rgba(255,255,255,0.045)" : "rgba(23,26,31,0.035)",
        selected: isDark ? "rgba(79,150,235,0.16)" : "rgba(42,95,176,0.08)",
      },
    },
    shape: { borderRadius: 12 },
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
          "::selection": { background: isDark ? "rgba(79,150,235,0.35)" : "rgba(42,95,176,0.2)" },
          "*": {
            scrollbarWidth: "thin",
            scrollbarColor: isDark ? "rgba(255,255,255,0.18) transparent" : "rgba(23,26,31,0.22) transparent",
          },
          "*::-webkit-scrollbar": { width: 8, height: 8 },
          "*::-webkit-scrollbar-track": { background: "transparent" },
          "*::-webkit-scrollbar-thumb": {
            backgroundColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(23,26,31,0.22)",
            borderRadius: 8,
          },
          "*::-webkit-scrollbar-thumb:hover": {
            backgroundColor: isDark ? "rgba(255,255,255,0.3)" : "rgba(23,26,31,0.35)",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(23,26,31,0.09)"}`,
            boxShadow: isDark
              ? "0 1px 2px rgba(0,0,0,0.35)"
              : "0 1px 2px rgba(16,24,40,0.03), 0 1px 3px rgba(16,24,40,0.05)",
          },
        },
      },
      MuiCardContent: {
        styleOverrides: { root: { padding: 20, "&:last-child": { paddingBottom: 20 } } },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 9, paddingLeft: 14, paddingRight: 14 },
          contained: { boxShadow: "none", "&:hover": { boxShadow: "none" } },
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
          root: { borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(23,26,31,0.07)" },
          head: {
            fontWeight: 700,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            color: isDark ? "#8891a4" : "#697082",
            backgroundColor: isDark ? "#151822" : "#ffffff",
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: isDark ? "#26293380" : "#1c1e24",
            backgroundImage: "none",
            fontSize: 12,
            borderRadius: 7,
            padding: "6px 10px",
          },
        },
      },
      MuiDivider: {
        styleOverrides: { root: { borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(23,26,31,0.09)" } },
      },
      MuiLinearProgress: {
        styleOverrides: { root: { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(23,26,31,0.07)" } },
      },
    },
  });
}

export default getTheme;

// Shared numeric/chart tokens that live outside the MUI palette (used by
// components that need a value regardless of theme, e.g. inline hex for the
// "ghost" plan bar).
export const chartTokens = {
  planFillLight: "rgba(23,26,31,0.10)",
  planFillDark: "rgba(255,255,255,0.10)",
  planStrokeLight: "rgba(23,26,31,0.38)",
  planStrokeDark: "rgba(255,255,255,0.42)",
};
