import { Typography, Stack } from "@mui/material";
import SourceCatalog from "@/components/SourceCatalog";
import ConnectorStatus from "@/components/ConnectorStatus";

export default function CatalogPage() {
  return (
    <>
      <Typography variant="h4" sx={{ mb: 0.5 }}>
        Source Catalog
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        What a full enterprise rollout's source estate looks like, and how
        much of it this project actually built vs left as reference.
      </Typography>
      <Stack spacing={4}>
        <SourceCatalog />
        <div>
          <Typography variant="h5" sx={{ mb: 0.5 }}>
            Connectors
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2, maxWidth: 760 }}>
            Live status of every source-system connector this project has code for.
          </Typography>
          <ConnectorStatus />
        </div>
      </Stack>
    </>
  );
}
