"use client";

import * as React from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { PaletteMode } from "@mui/material";
import { getTheme } from "./theme";

type ColorModeContextValue = {
  mode: PaletteMode;
  toggle: () => void;
};

export const ColorModeContext = React.createContext<ColorModeContextValue>({
  mode: "light",
  toggle: () => {},
});

export function useColorMode() {
  return React.useContext(ColorModeContext);
}

const STORAGE_KEY = "sap-anaplan-color-mode";

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = React.useState<PaletteMode>("light");

  React.useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as PaletteMode | null;
    if (stored === "light" || stored === "dark") {
      setMode(stored);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setMode("dark");
    }
  }, []);

  const toggle = React.useCallback(() => {
    setMode((prev) => {
      const next = prev === "light" ? "dark" : "light";
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const theme = React.useMemo(() => getTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={{ mode, toggle }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
