import { Box, Card, CardContent, Typography, Stack } from "@mui/material";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";

type Tone = "critical" | "watch" | "positive" | "info";
type Stage = { eyebrow: string; content: React.ReactNode; tone?: Tone };

const TONE_KEY: Record<Tone, string> = { critical: "error", watch: "warning", positive: "success", info: "info" };

export default function RootCauseCascade({ stages }: { stages: Stage[] }) {
  return (
    <Stack spacing={0} alignItems="stretch">
      {stages.map((s, i) => (
        <Box key={i}>
          <Card variant="outlined" sx={{ borderLeft: "3px solid", borderLeftColor: s.tone ? `${TONE_KEY[s.tone]}.main` : "divider" }}>
            <CardContent sx={{ py: 1.75, "&:last-child": { pb: 1.75 } }}>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "text.secondary" }}>
                {s.eyebrow}
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                {typeof s.content === "string" ? <Typography variant="body2">{s.content}</Typography> : s.content}
              </Box>
            </CardContent>
          </Card>
          {i < stages.length - 1 && (
            <Stack alignItems="center" sx={{ py: 0.25 }}>
              <ArrowDownwardRoundedIcon sx={{ fontSize: 18, color: "text.secondary", opacity: 0.45 }} />
            </Stack>
          )}
        </Box>
      ))}
    </Stack>
  );
}
