"use client";

import { Toolbar, Container, Box } from "@mui/material";
import AppHeader from "./AppHeader";
import Sidebar from "./Sidebar";
import { SidebarProvider, useSidebar, SIDEBAR_WIDTH_EXPANDED, SIDEBAR_WIDTH_COLLAPSED } from "./SidebarContext";

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
  return (
    <SidebarProvider>
      <ShellInner>{children}</ShellInner>
    </SidebarProvider>
  );
}
