import { Typography } from "@mui/material";
import OntologyUploader from "@/components/OntologyUploader";

export default function OntologyUploadPage() {
  return (
    <>
      <Typography variant="h4" sx={{ mb: 0.5 }}>
        Ontology Ingestion
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        Bring a new SAP extract, Anaplan export, or any other CSV into the
        model. Every step below runs for real — schema profiling, entity
        inference, cross-table relationship discovery — and nothing is
        written to the database until you approve it.
      </Typography>
      <OntologyUploader />
    </>
  );
}
