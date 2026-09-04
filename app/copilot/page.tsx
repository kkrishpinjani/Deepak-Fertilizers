import { Typography, Stack } from "@mui/material";
import CopilotInvestigator from "@/components/CopilotInvestigator";
import CopilotEvalPanel from "@/components/CopilotEvalPanel";

export default function CopilotPage() {
  return (
    <>
      <Typography variant="h4" sx={{ mb: 0.5 }}>
        CFO Copilot
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        A governed investigation engine, not a chat box: every question runs
        through intent classification, an ontology-scoped query, safety
        guards, KPI reconciliation, evidence scoring and confidence
        calibration before it can propose an action — which still requires
        your approval to go anywhere.
      </Typography>
      <Stack spacing={4}>
        <CopilotInvestigator />
        <CopilotEvalPanel />
      </Stack>
    </>
  );
}
