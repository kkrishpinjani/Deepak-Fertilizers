import { Typography, Box } from "@mui/material";
import OutlookRisk from "@/components/OutlookRisk";
import ChartCard from "@/components/charts/ChartCard";
import GroupedBarChart from "@/components/charts/GroupedBarChart";
import { runQuery } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getChartData() {
  return runQuery<{ plant_name: string; actual: number; budget: number }>(`
    SELECT plant_name, SUM(actual_revenue) AS actual, SUM(budget_revenue) AS budget
    FROM conformed.sales_performance
    GROUP BY plant_name
    ORDER BY plant_name;
  `);
}

export default async function OutlookPage() {
  const byPlant = await getChartData();

  return (
    <>
      <Typography variant="h4" sx={{ mb: 0.5 }}>
        Outlook & Risk
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 720 }}>
        Which locations are on pace to hit their revenue goal this year, and
        which need attention.
      </Typography>

      <Box sx={{ mb: 4 }}>
        <ChartCard title="Revenue by plant" subtitle="Actual vs plan, year to date.">
          <GroupedBarChart
            data={byPlant.map((r) => ({ category: r.plant_name, actual: Number(r.actual), budget: Number(r.budget) }))}
            series={[
              { key: "actual", label: "Actual" },
              { key: "budget", label: "Plan" },
            ]}
            unit="inr-millions"
          />
        </ChartCard>
      </Box>

      <OutlookRisk />
    </>
  );
}
