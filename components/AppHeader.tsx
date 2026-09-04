"use client";

import { AppBar, Toolbar, Typography, Chip, Box, useTheme } from "@mui/material";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import ThemeToggle from "./ThemeToggle";

export default function AppHeader() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: 1201,
        backgroundImage: isDark
          ? "linear-gradient(90deg, #0f1b34, #16233f)"
          : "linear-gradient(90deg, #1657c0, #1976d2)",
      }}
    >
      <Toolbar sx={{ gap: 1.5 }}>
        <BoltRoundedIcon />
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
          Finance Intelligence
        </Typography>
        <Chip
          size="small"
          label="Data up to date"
          sx={{
            bgcolor: "rgba(255,255,255,0.15)",
            color: "#fff",
            "& .MuiChip-label": { display: "flex", alignItems: "center", gap: 0.75 },
          }}
          icon={<Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#4ade80", ml: 1 }} />}
        />
        <ThemeToggle />
      </Toolbar>
    </AppBar>
  );
}
