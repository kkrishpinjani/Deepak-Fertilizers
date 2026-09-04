import { Typography, Stack } from "@mui/material";
import PageHeader from "@/components/PageHeader";
import DataJourney from "@/components/DataJourney";
import ConnectorStatus from "@/components/ConnectorStatus";
import OntologyUploader from "@/components/OntologyUploader";

export default function OntologyUploadPage() {
  return (
    <>
      <PageHeader
        eyebrow="Data & Governance · Ontology Ingestion"
        title="Ontology Ingestion"
        takeaway="Bring a new SAP extract, Anaplan export, or any other file into the model — and see exactly what happens to your data along the way."
        howThisWorks="Every step runs for real: schema profiling, entity inference, cross-table relationship discovery. Nothing is written to the database until you approve it."
      />

      <DataJourney />

      <Stack spacing={1} sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontSize: 16 }}>
          Connected systems right now
        </Typography>
      </Stack>
      <div style={{ marginBottom: 32 }}>
        <ConnectorStatus />
      </div>

      <Typography variant="h6" sx={{ fontSize: 16, mb: 1.5 }}>
        Bring in a new source
      </Typography>
      <OntologyUploader />
    </>
  );
}
