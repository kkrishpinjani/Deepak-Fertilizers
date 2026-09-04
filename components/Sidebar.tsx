"use client";

import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, Divider } from "@mui/material";
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

const SECTIONS = [
  { href: "/", label: "Overview", icon: <DashboardRoundedIcon /> },
  { href: "/ask", label: "Ask a Question", icon: <AutoAwesomeRoundedIcon /> },
  { href: "/copilot", label: "CFO Copilot", icon: <SmartToyRoundedIcon /> },
  { href: "/sales", label: "Sales Performance", icon: <TrendingUpRoundedIcon /> },
  { href: "/finance", label: "Finance & Profitability", icon: <AccountBalanceRoundedIcon /> },
  { href: "/planning", label: "Headcount & Working Capital", icon: <GroupsRoundedIcon /> },
  { href: "/ontology", label: "Supply Chain & Root-Cause", icon: <HubRoundedIcon /> },
  { href: "/ontology-upload", label: "Ontology Ingestion", icon: <UploadFileRoundedIcon /> },
  { href: "/industrial", label: "Plant & Asset Ops", icon: <PrecisionManufacturingRoundedIcon /> },
  { href: "/outlook", label: "Outlook & Risk", icon: <WarningAmberRoundedIcon /> },
  { href: "/glossary", label: "Glossary", icon: <MenuBookRoundedIcon /> },
  { href: "/catalog", label: "Source Catalog", icon: <ListAltRoundedIcon /> },
];

const WIDTH = 240;

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: WIDTH,
        flexShrink: 0,
        display: { xs: "none", sm: "block" },
        [`& .MuiDrawer-paper`]: { width: WIDTH, boxSizing: "border-box" },
      }}
    >
      <Toolbar />
      <Box sx={{ px: 2.5, py: 2 }}>
        <Typography variant="subtitle1" color="primary" fontWeight={700}>
          Enterprise AI
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Finance Intelligence
        </Typography>
      </Box>
      <Divider />
      <Box sx={{ overflow: "auto", py: 1.5, px: 1 }}>
        <List sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
          {SECTIONS.map((s) => {
            const active = pathname === s.href;
            return (
              <ListItemButton
                key={s.href}
                component={Link}
                href={s.href}
                selected={active}
                sx={{
                  borderRadius: 2,
                  "&:hover": { bgcolor: "action.hover" },
                  "&.Mui-selected": {
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    "&:hover": { bgcolor: "primary.dark" },
                    "& .MuiListItemIcon-root": { color: "inherit" },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{s.icon}</ListItemIcon>
                <ListItemText primary={s.label} primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} />
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    </Drawer>
  );
}

export { WIDTH as SIDEBAR_WIDTH };
