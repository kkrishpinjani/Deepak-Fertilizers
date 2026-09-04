import { Toolbar, Container, Box } from "@mui/material";
import AppHeader from "./AppHeader";
import Sidebar, { SIDEBAR_WIDTH } from "./Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex" }}>
      <AppHeader />
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, width: { sm: `calc(100% - ${SIDEBAR_WIDTH}px)` } }}>
        <Toolbar />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
}
