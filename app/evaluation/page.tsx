import { Stack } from "@mui/material";
import PageHeader from "@/components/PageHeader";
import CopilotEvalPanel from "@/components/CopilotEvalPanel";

export default function EvaluationPage() {
  return (
    <>
      <PageHeader
        eyebrow="Advanced Intelligence · Evaluation Suite"
        title="Evaluation Suite"
        takeaway="Prove that the AI answers are reliable. Every run replays the CFO Copilot's real engine against a fixed set of known questions with independently-computed correct answers, checking intent, KPI accuracy, and safety guards — not just the latest run, every run."
        howThisWorks="Each question runs the same intent classification, ontology-scoped query, KPI reconciliation and confidence calibration the live Copilot uses. A check passes only when the classified intent matches, the returned KPI matches an independently computed expectation, and every safety guard held."
      />
      <Stack spacing={4}>
        <CopilotEvalPanel />
      </Stack>
    </>
  );
}
