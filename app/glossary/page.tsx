import { Typography } from "@mui/material";
import BusinessGlossary from "@/components/BusinessGlossary";

export default function GlossaryPage() {
  return (
    <>
      <Typography variant="h4" sx={{ mb: 0.5 }}>
        Glossary
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 720 }}>
        What the terms on this site mean, so everyone reads the numbers the same way.
      </Typography>
      <BusinessGlossary />
    </>
  );
}
