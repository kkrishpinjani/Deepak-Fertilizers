import { Stack } from "@mui/material";
import PageHeader from "@/components/PageHeader";
import CFOBrief from "@/components/CFOBrief";
import CopilotInvestigator from "@/components/CopilotInvestigator";
import CopilotEvalPanel from "@/components/CopilotEvalPanel";
import { getBriefItems } from "@/lib/cfoBrief";

export const dynamic = "force-dynamic";

export default async function CopilotPage({ searchParams }: { searchParams: { q?: string } }) {
  const items = await getBriefItems();

  return (
    <>
      <PageHeader
        eyebrow="Executive · CFO Copilot"
        title="CFO Copilot"
        takeaway="A governed investigation engine, not a chat box — every question runs through intent classification, an ontology-scoped query, safety guards, KPI reconciliation, evidence scoring and confidence calibration before it can propose an action, which still requires your approval."
        howThisWorks="Investigate plan → ontology-scoped SQL query → KPI reconciliation against the source tables → evidence scoring → confidence calibration → (when warranted) an approval-gated action proposal. Nothing is ever executed automatically — every proposal waits for a human decision."
      />
      <Stack spacing={4}>
        <CFOBrief items={items} />
        <CopilotInvestigator initialQuestion={searchParams?.q} />
        <CopilotEvalPanel />
      </Stack>
    </>
  );
}
