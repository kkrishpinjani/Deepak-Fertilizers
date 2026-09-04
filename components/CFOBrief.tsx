import { Card, CardContent, Typography, Stack, Box } from "@mui/material";
import Link from "next/link";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import StatusBadge, { type Tone } from "./StatusBadge";

export type BriefItem = {
  title: string;
  detail: string;
  impact: "High" | "Medium" | "Low";
  question: string;
};

const IMPACT_TONE: Record<BriefItem["impact"], Tone> = { High: "critical", Medium: "watch", Low: "info" };

export default function CFOBrief({ items }: { items: BriefItem[] }) {
  if (items.length === 0) {
    return (
      <Card variant="outlined">
        <CardContent>
          <StatusBadge tone="positive" label="No items need attention" />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Revenue, costs and working capital are all tracking within normal range this period.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" sx={{ mb: 0.5 }} spacing={0.5}>
          <Typography variant="h6" sx={{ fontSize: 16 }}>
            Today&rsquo;s CFO Brief
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {items.length} item{items.length === 1 ? "" : "s"} require attention
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Click any item to open a full investigation below — root cause, evidence and a recommended action.
        </Typography>
        <Stack spacing={1}>
          {items.map((item, i) => (
            <Link key={i} href={`/copilot?q=${encodeURIComponent(item.question)}`} style={{ textDecoration: "none", color: "inherit" }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                spacing={1.5}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  transition: "border-color 0.15s, background-color 0.15s",
                  "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={650}>
                    {item.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.detail}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                  <StatusBadge tone={IMPACT_TONE[item.impact]} label={`${item.impact} impact`} size="small" pill />
                  <ChevronRightRoundedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                </Stack>
              </Stack>
            </Link>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
