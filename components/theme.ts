"use client";

import { createTheme } from "@mui/material/styles";
import type { PaletteMode } from "@mui/material";

export function getTheme(mode: PaletteMode) {
  const isDark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: { main: isDark ? "#5b9bff" : "#1657c0" },
      secondary: { main: isDark ? "#4fd1c5" : "#0f9d8c" },
      success: { main: isDark ? "#4ade80" : "#1a8a4a" },
      warning: { main: isDark ? "#fbbf24" : "#b3690a" },
      error: { main: isDark ? "#f87171" : "#c62828" },
      background: {
        default: isDark ? "#0b1220" : "#f5f7fb",
        paper: isDark ? "#121a2b" : "#ffffff",
      },
      divider: isDark ? "rgba(255,255,255,0.09)" : "rgba(15,23,42,0.08)",
      text: {
        primary: isDark ? "#e8ecf4" : "#101828",
        secondary: isDark ? "#9aa7bd" : "#5b6577",
      },
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: "'Inter', 'Roboto', 'Segoe UI', Arial, sans-serif",
      h4: { fontWeight: 750, letterSpacing: -0.5 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
      subtitle1: { fontWeight: 650 },
      button: { fontWeight: 650, textTransform: "none" },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            boxShadow: isDark
              ? "0 1px 2px rgba(0,0,0,0.4)"
              : "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 10 },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600 },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 700,
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: 0.4,
            color: isDark ? "#9aa7bd" : "#5b6577",
          },
        },
      },
    },
  });
}

export default getTheme;
