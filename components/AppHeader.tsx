"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Stack,
  IconButton,
  InputBase,
  Badge,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Divider,
  Tooltip,
  useMediaQuery,
  useTheme as useMuiTheme,
} from "@mui/material";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import type { BriefItem } from "./CFOBrief";
import ThemeToggle from "./ThemeToggle";
import { useSidebar } from "./SidebarContext";

// Real "needs attention" items from the CFO Copilot brief (same rule-derived
// SQL as /copilot) — never a hardcoded sample list.
function useBriefItems() {
  const [items, setItems] = useState<BriefItem[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/copilot/brief", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => !cancelled && setItems(d.items ?? []))
      .catch(() => !cancelled && setItems([]));
    return () => {
      cancelled = true;
    };
  }, []);
  return items;
}

type ConnectorRow = { name: string; mode: "active" | "dormant"; configured: boolean; healthy: boolean };

// Polls the real /api/connectors health check (same one that backs
// Connector Health on /catalog) and reports genuine elapsed-since-last-check
// time — never a hardcoded or pre-seeded minute count.
function DataFreshness() {
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [systemHealthy, setSystemHealthy] = useState<boolean | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch("/api/connectors", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        const active: ConnectorRow[] = (data.connectors ?? []).filter((c: ConnectorRow) => c.mode === "active");
        setSystemHealthy(active.length > 0 && active.every((c) => c.healthy));
        setLastChecked(new Date());
      } catch {
        if (!cancelled) setSystemHealthy(false);
      }
    }
    check();
    const poll = setInterval(check, 60_000);
    const tick = setInterval(() => setNow(new Date()), 15_000);
    return () => {
      cancelled = true;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, []);

  if (systemHealthy === null || !lastChecked) {
    return (
      <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1.25, py: 0.5, borderRadius: 999, bgcolor: "rgba(255,255,255,0.12)" }}>
        <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.4)", flexShrink: 0 }} />
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
          Checking data systems…
        </Typography>
      </Stack>
    );
  }

  const elapsedMin = Math.max(0, Math.round(((now ?? new Date()).getTime() - lastChecked.getTime()) / 60_000));

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1.25, py: 0.5, borderRadius: 999, bgcolor: "rgba(255,255,255,0.12)" }}>
      <Box
        sx={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          bgcolor: systemHealthy ? "#4ade80" : "#f87171",
          flexShrink: 0,
          boxShadow: systemHealthy ? "0 0 8px rgba(74,222,128,0.8)" : "0 0 8px rgba(248,113,113,0.8)",
        }}
      />
      <Box>
        <Typography variant="caption" sx={{ display: "block", color: "#fff", fontWeight: 650, lineHeight: 1.15 }}>
          {systemHealthy ? "Data systems healthy" : "Data systems degraded"}
        </Typography>
        <Typography variant="caption" sx={{ display: "block", color: "rgba(255,255,255,0.7)", lineHeight: 1.15, fontSize: 10.5 }}>
          {elapsedMin === 0 ? "Checked just now" : `Checked ${elapsedMin} min${elapsedMin === 1 ? "" : "s"} ago`}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function AppHeader() {
  const router = useRouter();
  const muiTheme = useMuiTheme();
  const isDark = muiTheme.palette.mode === "dark";
  const smUp = useMediaQuery(muiTheme.breakpoints.up("sm"));
  const mdUp = useMediaQuery(muiTheme.breakpoints.up("md"));
  const { setMobileOpen } = useSidebar();

  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
  const [search, setSearch] = useState("");
  const briefItems = useBriefItems();

  function runSearch() {
    if (!search.trim()) return;
    router.push(`/ask?q=${encodeURIComponent(search.trim())}`);
  }

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: 1201,
        backgroundImage: isDark
          ? "linear-gradient(90deg, #060814, #0d1330 55%, #131a3c)"
          : "linear-gradient(90deg, #1c3f7a, #2a5fb0)",
        borderBottom: isDark ? "1px solid rgba(90,169,255,0.16)" : "none",
        boxShadow: isDark ? "0 8px 24px rgba(2,4,16,0.45)" : "none",
      }}
    >
      <Toolbar sx={{ gap: { xs: 1, md: 1.5 } }}>
        <IconButton
          onClick={() => setMobileOpen(true)}
          sx={{ display: { xs: "inline-flex", sm: "none" }, color: "#fff" }}
        >
          <MenuRoundedIcon />
        </IconButton>

        {!smUp && <BoltRoundedIcon sx={{ color: "#fff" }} />}

        {mdUp && (
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ flexShrink: 0 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ color: "#fff", lineHeight: 1.1, fontWeight: 750 }}>
                Finance Intelligence
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.65)" }}>
                Enterprise AI · Deepak Fertilisers &amp; Petrochemicals
              </Typography>
            </Box>
          </Stack>
        )}

        <Box sx={{ flexGrow: 1 }} />

        {mdUp && (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{
              bgcolor: "rgba(255,255,255,0.12)",
              borderRadius: 999,
              px: 1.5,
              py: 0.5,
              width: 300,
              transition: "background-color 0.15s",
              "&:focus-within": { bgcolor: "rgba(255,255,255,0.18)" },
            }}
          >
            <SearchRoundedIcon sx={{ fontSize: 18, color: "rgba(255,255,255,0.75)" }} />
            <InputBase
              placeholder="Ask a business question…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              sx={{ color: "#fff", fontSize: 13.5, flex: 1, "& ::placeholder": { color: "rgba(255,255,255,0.6)", opacity: 1 } }}
            />
          </Stack>
        )}

        {smUp && <DataFreshness />}

        <Tooltip title="Needs attention">
          <IconButton onClick={(e) => setNotifAnchor(e.currentTarget)} sx={{ color: "#fff" }}>
            <Badge badgeContent={briefItems?.length ?? 0} color="error">
              <NotificationsRoundedIcon fontSize="small" />
            </Badge>
          </IconButton>
        </Tooltip>
        <Menu anchorEl={notifAnchor} open={!!notifAnchor} onClose={() => setNotifAnchor(null)} PaperProps={{ sx: { width: 340, mt: 1 } }}>
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle2">Needs your attention</Typography>
            <Typography variant="caption" color="text.secondary">
              {briefItems === null
                ? "Loading from CFO Copilot…"
                : `${briefItems.length} item${briefItems.length === 1 ? "" : "s"} flagged by CFO Copilot`}
            </Typography>
          </Box>
          <Divider />
          {briefItems !== null && briefItems.length === 0 && (
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                Nothing needs attention right now.
              </Typography>
            </Box>
          )}
          {(briefItems ?? []).map((item, i) => (
            <MenuItem
              key={i}
              onClick={() => {
                setNotifAnchor(null);
                router.push(`/copilot?q=${encodeURIComponent(item.question)}`);
              }}
              sx={{ alignItems: "flex-start", whiteSpace: "normal", py: 1.25 }}
            >
              <ListItemIcon sx={{ mt: 0.25 }}>
                <ChevronRightRoundedIcon fontSize="small" color={item.impact === "High" ? "error" : "warning"} />
              </ListItemIcon>
              <ListItemText
                primary={item.title}
                secondary={`${item.impact} impact · ${item.detail}`}
                primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600 }}
                secondaryTypographyProps={{ fontSize: 12 }}
              />
            </MenuItem>
          ))}
        </Menu>

        <ThemeToggle />

        <Tooltip title="Account">
          <IconButton onClick={(e) => setProfileAnchor(e.currentTarget)} sx={{ ml: 0.25 }}>
            <Avatar sx={{ width: 30, height: 30, fontSize: 13, bgcolor: "rgba(255,255,255,0.2)", color: "#fff" }}>FA</Avatar>
          </IconButton>
        </Tooltip>
        <Menu anchorEl={profileAnchor} open={!!profileAnchor} onClose={() => setProfileAnchor(null)} PaperProps={{ sx: { width: 240, mt: 1 } }}>
          <Box sx={{ px: 2, py: 1.25 }}>
            <Typography variant="subtitle2">Finance Admin</Typography>
            <Typography variant="caption" color="text.secondary">
              DFPCL Finance Team · Viewer
            </Typography>
          </Box>
          <Divider />
          <MenuItem
            onClick={() => {
              setProfileAnchor(null);
              router.push("/catalog");
            }}
          >
            Data & Governance settings
          </MenuItem>
          <MenuItem
            onClick={() => {
              setProfileAnchor(null);
              router.push("/glossary");
            }}
          >
            Help & documentation
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={async () => {
              setProfileAnchor(null);
              await fetch("/api/logout", { method: "POST" });
              router.push("/login");
              router.refresh();
            }}
          >
            Sign out
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
