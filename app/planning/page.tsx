import { Typography, Grid } from "@mui/material";
import QueryRunner from "@/components/QueryRunner";
import ChartCard from "@/components/charts/ChartCard";
import GroupedBarChart from "@/components/charts/GroupedBarChart";
import { runQuery } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getChartData() {
  const headcount = await runQuery<{ cost_center_name: string; planned_headcount: number }>(`
    SELECT cost_center_name, planned_headcount
    FROM conformed.headcount_summary
    WHERE date_key = (SELECT MAX(date_key) FROM conformed.headcount_summary)
    ORDER BY planned_headcount DESC;
  `);

  const workingCapital = await runQuery<{
    month: string;
    accounts_receivable: number;
    accounts_payable: number;
    inventory: number;
  }>(`
    SELECT
      DATE_FORMAT(date_key, '%b %Y') AS month,
      accounts_receivable, accounts_payable, inventory
    FROM conformed.working_capital_summary
    ORDER BY date_key;
  `);

  return { headcount, workingCapital };
}

export default async function PlanningPage() {
  const { headcount, workingCapital } = await getChartData();
  const money = (n: number) => `₹${(n / 1_000_000).toFixed(2)}M`;

  return (
    <>
      <Typography variant="h4" sx={{ mb: 0.5 }}>
        Headcount & Working Capital
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 720 }}>
        Planned staffing and cash-flow figures from Anaplan. There's no
        actual figure to compare these against yet, so they're shown as
        plan-only.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <ChartCard title="Planned headcount" subtitle="By cost center, latest month.">
            <GroupedBarChart
              data={headcount.map((r) => ({ category: r.cost_center_name, headcount: Number(r.planned_headcount) }))}
              series={[{ key: "headcount", label: "Planned headcount" }]}
              unit="headcount"
            />
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <ChartCard title="Working capital" subtitle="Receivables, payables and inventory by month.">
            <GroupedBarChart
              data={workingCapital.map((r) => ({
                category: r.month,
                ar: Number(r.accounts_receivable),
                ap: Number(r.accounts_payable),
                inv: Number(r.inventory),
              }))}
              series={[
                { key: "ar", label: "Receivables" },
                { key: "ap", label: "Payables" },
                { key: "inv", label: "Inventory" },
              ]}
              unit="inr-millions"
            />
          </ChartCard>
        </Grid>
      </Grid>

      <QueryRunner
        ids={["headcount_by_cost_center", "working_capital"]}
        title="Planning Reports"
        subtitle="Pick a question below to see the numbers behind it."
      />
    </>
  );
}
