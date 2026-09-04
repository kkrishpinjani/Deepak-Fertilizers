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
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import ThemeToggle from "./ThemeToggle";
import { useSidebar } from "./SidebarContext";

const NOTIFICATIONS = [
  { icon: <TrendingDownRoundedIcon fontSize="small" color="error" />, title: "Revenue is ₹210K below plan", detail: "High impact · Business Unit A" },
  { icon: <ReceiptLongRoundedIcon fontSize="small" color="warning" />, title: "Operating costs ₹240K above budget", detail: "Medium impact · Raw materials & logistics" },
  { icon: <AccountBalanceWalletRoundedIcon fontSize="small" color="warning" />, title: "Receivables increased 8.4%", detail: "Medium impact · Working capital" },
];

function DataFreshness() {
  const [minutesAgo, setMinutesAgo] = useState(12);
  useEffect(() => {
    const id = setInterval(() => setMinutesAgo((m) => m + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1.25, py: 0.5, borderRadius: 999, bgcolor: "rgba(255,255,255,0.12)" }}>
      <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#4ade80", flexShrink: 0 }} />
      <Box>
        <Typography variant="caption" sx={{ display: "block", color: "#fff", fontWeight: 650, lineHeight: 1.15 }}>
          Data up to date
        </Typography>
        <Typography variant="caption" sx={{ display: "block", color: "rgba(255,255,255,0.7)", lineHeight: 1.15, fontSize: 10.5 }}>
          Updated {minutesAgo} min{minutesAgo === 1 ? "" : "s"} ago
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
        backgroundImage: isDark ? "linear-gradient(90deg, #0d1526, #142038)" : "linear-gradient(90deg, #1c3f7a, #2a5fb0)",
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

        <Tooltip title="Notifications">
          <IconButton onClick={(e) => setNotifAnchor(e.currentTarget)} sx={{ color: "#fff" }}>
            <Badge badgeContent={NOTIFICATIONS.length} color="error">
              <NotificationsRoundedIcon fontSize="small" />
            </Badge>
          </IconButton>
        </Tooltip>
        <Menu anchorEl={notifAnchor} open={!!notifAnchor} onClose={() => setNotifAnchor(null)} PaperProps={{ sx: { width: 340, mt: 1 } }}>
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle2">Needs your attention</Typography>
            <Typography variant="caption" color="text.secondary">
              {NOTIFICATIONS.length} items flagged by CFO Copilot
            </Typography>
          </Box>
          <Divider />
          {NOTIFICATIONS.map((n, i) => (
            <MenuItem
              key={i}
              onClick={() => {
                setNotifAnchor(null);
                router.push("/copilot");
              }}
              sx={{ alignItems: "flex-start", whiteSpace: "normal", py: 1.25 }}
            >
              <ListItemIcon sx={{ mt: 0.25 }}>{n.icon}</ListItemIcon>
              <ListItemText primary={n.title} secondary={n.detail} primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600 }} secondaryTypographyProps={{ fontSize: 12 }} />
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
          <MenuItem onClick={() => setProfileAnchor(null)}>Data & Governance settings</MenuItem>
          <MenuItem onClick={() => setProfileAnchor(null)}>Help & documentation</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
