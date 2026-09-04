import { Grid, Box } from "@mui/material";
import PageHeader from "@/components/PageHeader";
import OutlookRisk from "@/components/OutlookRisk";
import ChartCard from "@/components/charts/ChartCard";
import GroupedBarChart from "@/components/charts/GroupedBarChart";
import KpiCard from "@/components/KpiCard";
import { runQuery } from "@/lib/db";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import FlagRoundedIcon from "@mui/icons-material/FlagRounded";

export const dynamic = "force-dynamic";

async function getChartData() {
  const byPlant = await runQuery<{ plant_name: string; actual: number; budget: number }>(`
    SELECT plant_name, SUM(actual_revenue) AS actual, SUM(budget_revenue) AS budget
    FROM conformed.sales_performance
    GROUP BY plant_name
    ORDER BY plant_name;
  `);

  const [forecast] = await runQuery<{ actual: number; forecast: number; forecast_attainment: number }>(`
    SELECT SUM(actual_revenue) AS actual, SUM(forecast_revenue) AS forecast,
           SUM(actual_revenue) / NULLIF(SUM(forecast_revenue), 0) * 100 AS forecast_attainment
    FROM conformed.sales_performance;
  `);

  return { byPlant, forecast };
}

function fmt(n: number) {
  return `₹${(n / 1_000_000).toFixed(2)}M`;
}

export default async function OutlookPage() {
  const { byPlant, forecast } = await getChartData();
  const forecastAttainment = Number(forecast?.forecast_attainment);

  return (
    <>
      <PageHeader
        eyebrow="Executive · Outlook & Risk"
        title="Outlook & Risk"
        takeaway="Where the business is forecast to land, which locations are on pace to hit their revenue goal, and which risks need a decision now."
        howThisWorks="Forecast figures come from the latest Anaplan re-forecast, not the original budget. The risk matrix combines each plant's current attainment trend (probability of missing plan) with the size of its revenue base (financial impact if it does)."
      />

      {forecast && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} lg={4}>
            <KpiCard
              label="Forecast Revenue"
              value={fmt(Number(forecast.forecast))}
              icon={InsightsRoundedIcon}
              comparison="Latest Anaplan re-forecast for the period"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={4}>
            <KpiCard
              label="Actual vs Forecast"
              value={`${forecastAttainment.toFixed(1)}%`}
              icon={FlagRoundedIcon}
              percent={forecastAttainment}
              status={{ tone: forecastAttainment >= 100 ? "positive" : forecastAttainment >= 95 ? "watch" : "critical", label: forecastAttainment >= 100 ? "On track" : "Behind forecast" }}
            />
          </Grid>
        </Grid>
      )}

      <Box sx={{ mb: 4 }}>
        <ChartCard title="Revenue by plant" subtitle="Actual vs plan, year to date, ₹ millions. The outlined bar is the Anaplan plan.">
          <GroupedBarChart
            data={byPlant.map((r) => ({ category: r.plant_name, actual: Number(r.actual), budget: Number(r.budget) }))}
            series={[
              { key: "actual", label: "Actual" },
              { key: "budget", label: "Plan", variant: "ghost" },
            ]}
            unit="inr-millions"
          />
        </ChartCard>
      </Box>

      <OutlookRisk />
    </>
  );
}
