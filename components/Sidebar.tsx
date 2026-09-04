"use client";

import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, Tooltip, IconButton, Stack } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import PrecisionManufacturingRoundedIcon from "@mui/icons-material/PrecisionManufacturingRounded";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { useSidebar, SIDEBAR_WIDTH_EXPANDED, SIDEBAR_WIDTH_COLLAPSED } from "./SidebarContext";

type NavItem = { href: string; label: string; icon: React.ReactNode };
type NavGroup = { heading: string; items: NavItem[] };

const SECTIONS: NavGroup[] = [
  {
    heading: "Executive",
    items: [
      { href: "/", label: "Overview", icon: <DashboardRoundedIcon /> },
      { href: "/ask", label: "Ask a Question", icon: <AutoAwesomeRoundedIcon /> },
      { href: "/copilot", label: "CFO Copilot", icon: <SmartToyRoundedIcon /> },
      { href: "/outlook", label: "Outlook & Risk", icon: <WarningAmberRoundedIcon /> },
    ],
  },
  {
    heading: "Commercial",
    items: [{ href: "/sales", label: "Sales Performance", icon: <TrendingUpRoundedIcon /> }],
  },
  {
    heading: "Finance",
    items: [
      { href: "/finance", label: "Finance & Profitability", icon: <AccountBalanceRoundedIcon /> },
      { href: "/planning", label: "Headcount & Working Capital", icon: <GroupsRoundedIcon /> },
    ],
  },
  {
    heading: "Operations",
    items: [
      { href: "/ontology", label: "Supply Chain & Root-Cause", icon: <HubRoundedIcon /> },
      { href: "/industrial", label: "Plant & Asset Ops", icon: <PrecisionManufacturingRoundedIcon /> },
    ],
  },
  {
    heading: "Data & Governance",
    items: [
      { href: "/ontology-upload", label: "Ontology Ingestion", icon: <UploadFileRoundedIcon /> },
      { href: "/catalog", label: "Source Catalog", icon: <ListAltRoundedIcon /> },
      { href: "/glossary", label: "Glossary", icon: <MenuBookRoundedIcon /> },
    ],
  },
];

const NAVY = "#0e1830";
const NAVY_BORDER = "rgba(255,255,255,0.08)";
const MUTED = "#8390ac";

function SidebarContent({ collapsed, pathname, onNavigate }: { collapsed: boolean; pathname: string; onNavigate?: () => void }) {
  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: NAVY, color: "#fff" }}>
      <Toolbar
        sx={{
          gap: 1,
          px: collapsed ? 0 : 2.5,
          justifyContent: collapsed ? "center" : "flex-start",
          borderBottom: `1px solid ${NAVY_BORDER}`,
        }}
      >
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: "8px",
            bgcolor: "primary.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <BoltRoundedIcon sx={{ fontSize: 18 }} />
        </Box>
        {!collapsed && (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ lineHeight: 1.15, color: "#fff" }} noWrap>
              Finance Intelligence
            </Typography>
            <Typography variant="caption" sx={{ color: MUTED }} noWrap>
              DFPCL · Enterprise AI
            </Typography>
          </Box>
        )}
      </Toolbar>

      <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", py: 1, px: collapsed ? 1 : 1.5 }}>
        {SECTIONS.map((section, si) => (
          <Box key={section.heading} sx={{ mb: si === SECTIONS.length - 1 ? 0 : 1.25 }}>
            {!collapsed && (
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  color: "rgba(255,255,255,0.35)",
                  fontWeight: 700,
                  letterSpacing: 0.9,
                  textTransform: "uppercase",
                  fontSize: 10.5,
                  px: 1.25,
                  mb: 0.5,
                  mt: si === 0 ? 0.5 : 0,
                }}
              >
                {section.heading}
              </Typography>
            )}
            <List sx={{ display: "flex", flexDirection: "column", gap: 0.25, py: 0 }}>
              {section.items.map((item) => {
                const active = pathname === item.href;
                const button = (
                  <ListItemButton
                    key={item.href}
                    component={Link}
                    href={item.href}
                    selected={active}
                    onClick={onNavigate}
                    sx={{
                      borderRadius: 2,
                      minHeight: 36,
                      py: 0.5,
                      justifyContent: collapsed ? "center" : "flex-start",
                      px: collapsed ? 1 : 1.5,
                      color: active ? "#fff" : "rgba(255,255,255,0.68)",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.06)" },
                      "&.Mui-selected": {
                        bgcolor: "primary.main",
                        color: "#fff",
                        "&:hover": { bgcolor: "primary.main" },
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: collapsed ? 0 : 34,
                        color: "inherit",
                        justifyContent: "center",
                        "& svg": { fontSize: 19 },
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {!collapsed && (
                      <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 13.5, fontWeight: active ? 700 : 550 }} />
                    )}
                  </ListItemButton>
                );
                return collapsed ? (
                  <Tooltip key={item.href} title={item.label} placement="right" arrow>
                    <span>{button}</span>
                  </Tooltip>
                ) : (
                  button
                );
              })}
            </List>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useSidebar();
  const width = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          width,
          flexShrink: 0,
          display: { xs: "none", sm: "block" },
          transition: "width 0.18s ease",
          [`& .MuiDrawer-paper`]: { width, boxSizing: "border-box", border: "none", transition: "width 0.18s ease" },
        }}
      >
        <SidebarContent collapsed={collapsed} pathname={pathname} />
        <Stack sx={{ borderTop: `1px solid ${NAVY_BORDER}`, bgcolor: NAVY, p: 1, alignItems: collapsed ? "center" : "flex-end" }}>
          <IconButton size="small" onClick={toggleCollapsed} sx={{ color: MUTED, "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.06)" } }}>
            {collapsed ? <ChevronRightRoundedIcon fontSize="small" /> : <ChevronLeftRoundedIcon fontSize="small" />}
          </IconButton>
        </Stack>
      </Drawer>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", sm: "none" },
          [`& .MuiDrawer-paper`]: { width: SIDEBAR_WIDTH_EXPANDED, boxSizing: "border-box", border: "none" },
        }}
      >
        <SidebarContent collapsed={false} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
      </Drawer>
    </>
  );
}
