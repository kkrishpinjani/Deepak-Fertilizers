"use client";

import { Box, Card, CardContent, Typography, Stack, Tooltip } from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CloudRoundedIcon from "@mui/icons-material/CloudRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";

const STAGES = [
  {
    title: "Data Sources",
    icon: CloudRoundedIcon,
    detail: "SAP, Anaplan and other enterprise systems",
    help: "The original systems of record — SAP for actuals, Anaplan for plans, plus HR, supply-chain and plant systems.",
  },
  {
    title: "Ingestion",
    icon: DownloadRoundedIcon,
    detail: "Extracts land in the raw data layer",
    help: "Files and feeds are pulled in exactly as the source system produced them, before anything is changed.",
  },
  {
    title: "Normalization",
    icon: TuneRoundedIcon,
    detail: "Cleaned and put into one consistent shape",
    help: "Currencies, dates, units and naming are made consistent so figures from different systems can be compared.",
  },
  {
    title: "Business Ontology",
    icon: HubRoundedIcon,
    detail: "Connected into one shared model",
    help: "Records are linked by what they mean in the business — this plant, this customer, this GL account — not by table names.",
  },
  {
    title: "Business Entities",
    icon: CategoryRoundedIcon,
    detail: "Company, Plant, Product, Customer, Vendor…",
    help: "The connected records resolve into the real-world things finance teams already talk about.",
  },
  {
    title: "AI Intelligence",
    icon: AutoAwesomeRoundedIcon,
    detail: "Powers every chart, answer and insight",
    help: "Ask a Question, CFO Copilot and every dashboard in this app run on top of this same model.",
  },
];

export default function DataJourney() {
  return (
    <Card variant="outlined" sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontSize: 16, mb: 0.25 }}>
          How your data becomes an answer
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Every number in this app has travelled the same path — nothing skips a step.
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: 0.5 }}>
          {STAGES.map((s, i) => {
            const Icon = s.icon;
            return (
              <Box key={s.title} sx={{ display: "flex", alignItems: "center", flex: "1 1 150px" }}>
                <Stack
                  spacing={0.75}
                  alignItems="center"
                  sx={{
                    flex: 1,
                    textAlign: "center",
                    p: 1.5,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    minWidth: 130,
                  }}
                >
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: "9px",
                      bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(42,95,176,0.08)"),
                      color: "primary.main",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon fontSize="small" />
                  </Box>
                  <Stack direction="row" spacing={0.4} alignItems="center">
                    <Typography variant="body2" fontWeight={700}>
                      {s.title}
                    </Typography>
                    <Tooltip title={s.help} arrow placement="top">
                      <InfoOutlinedIcon sx={{ fontSize: 13, color: "text.secondary", opacity: 0.6 }} />
                    </Tooltip>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {s.detail}
                  </Typography>
                </Stack>
                {i < STAGES.length - 1 && (
                  <ArrowForwardRoundedIcon sx={{ mx: 0.5, fontSize: 18, color: "text.secondary", opacity: 0.4, flexShrink: 0 }} />
                )}
              </Box>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
}
