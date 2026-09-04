import { Stack } from "@mui/material";
import PageHeader from "@/components/PageHeader";
import ConnectorStatus from "@/components/ConnectorStatus";

export default function ConnectorsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Advanced Intelligence · Connector Health"
        title="Connector Health"
        takeaway="Every system this platform can connect to, and the truth about which ones are live right now. Active connectors run genuine network health checks against real local infrastructure; dormant connectors are real, tested client code waiting on a live account."
        howThisWorks="Neo4j and the local Ollama model are active — this project runs a dedicated Docker graph database and a local LLM used for intent classification and rationale generation. Snowflake, SAP OData and the Anaplan API have real client code (query execution, schema discovery, model/module discovery) but no live account configured, so they report as dormant rather than pretending to be connected."
      />
      <Stack spacing={4}>
        <ConnectorStatus />
      </Stack>
    </>
  );
}
