"use client";

import { usePathname } from "next/navigation";
import { Toolbar, Container, Box } from "@mui/material";
import AppHeader from "./AppHeader";
import Sidebar from "./Sidebar";
import { SidebarProvider, useSidebar, SIDEBAR_WIDTH_EXPANDED, SIDEBAR_WIDTH_COLLAPSED } from "./SidebarContext";

// Routes that render full-bleed, without the sidebar/header chrome —
// currently just the login screen, which is meant to feel like an
// immersive entry point rather than a dashboard page.
const CHROMELESS_ROUTES = ["/login"];

function ShellInner({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  const width = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  return (
    <Box sx={{ display: "flex" }}>
      <AppHeader />
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          width: { sm: `calc(100% - ${width}px)` },
          transition: "width 0.18s ease",
        }}
      >
        <Toolbar />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (CHROMELESS_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }
  return (
    <SidebarProvider>
      <ShellInner>{children}</ShellInner>
    </SidebarProvider>
  );
}
