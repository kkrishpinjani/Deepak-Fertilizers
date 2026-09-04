import { Typography } from "@mui/material";
import AskCortex from "@/components/AskCortex";

export default function AskPage() {
  return (
    <>
      <Typography variant="h4" sx={{ mb: 0.5 }}>
        Ask a Question
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 720 }}>
        Type a question in plain English and get an instant answer from the data.
      </Typography>
      <AskCortex />
    </>
  );
}
