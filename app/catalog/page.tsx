import { Typography, Stack } from "@mui/material";
import PageHeader from "@/components/PageHeader";
import SourceCatalog from "@/components/SourceCatalog";
import ConnectorStatus from "@/components/ConnectorStatus";

export default function CatalogPage() {
  return (
    <>
      <PageHeader
        eyebrow="Data & Governance · Source Catalog"
        title="Source Catalog"
        takeaway="Where every number on this site comes from — the full reference catalog an enterprise rollout would cover, and how much of it this project has actually built versus catalogued for reference."
      />
      <Stack spacing={4}>
        <SourceCatalog />
        <div>
          <Typography variant="h6" sx={{ fontSize: 16, mb: 0.5 }}>
            Connectors
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 760 }}>
            Live status of every source-system connector this project has code for.
          </Typography>
          <ConnectorStatus />
        </div>
      </Stack>
    </>
  );
}
