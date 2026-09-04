import { Typography, Grid } from "@mui/material";
import QueryRunner from "@/components/QueryRunner";
import ChartCard from "@/components/charts/ChartCard";
import GroupedBarChart from "@/components/charts/GroupedBarChart";
import DivergingBarChart from "@/components/charts/DivergingBarChart";
import { runQuery } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getChartData() {
  const byAccount = await runQuery<{ gl_account_name: string; actual: number; budget: number }>(`
    SELECT gl_account_name, SUM(actual_amount) AS actual, SUM(budget_amount) AS budget
    FROM conformed.finance_performance
    GROUP BY gl_account_name
    ORDER BY actual DESC;
  `);

  const byCostCenter = await runQuery<{ label: string; variance: number }>(`
    SELECT CONCAT(cost_center_name, ' — ', gl_account_name) AS label, SUM(financial_variance) AS variance
    FROM conformed.finance_performance
    GROUP BY cost_center_name, gl_account_name
    ORDER BY variance DESC;
  `);

  return { byAccount, byCostCenter };
}

export default async function FinancePage() {
  const { byAccount, byCostCenter } = await getChartData();
  const money = (n: number) => `₹${(n / 1_000_000).toFixed(2)}M`;

  return (
    <>
      <Typography variant="h4" sx={{ mb: 0.5 }}>
        Finance & Profitability
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 720 }}>
        Costs against budget, monthly profit (EBITDA), and revenue in US dollars.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <ChartCard title="Cost by account" subtitle="Actual vs plan.">
            <GroupedBarChart
              data={byAccount.map((r) => ({ category: r.gl_account_name, actual: Number(r.actual), budget: Number(r.budget) }))}
              series={[
                { key: "actual", label: "Actual" },
                { key: "budget", label: "Plan" },
              ]}
              unit="inr-millions"
            />
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <ChartCard title="Cost variance by cost center" subtitle="Actual minus plan — over plan runs red.">
            <DivergingBarChart
              data={byCostCenter.map((r) => ({ label: r.label, value: Number(r.variance) }))}
              unit="inr-millions"
              invert
              positiveLabel="Over budget"
              negativeLabel="Under budget"
            />
          </ChartCard>
        </Grid>
      </Grid>

      <QueryRunner
        ids={["budget_vs_actual_finance", "budget_by_cost_center", "ebitda", "revenue_usd"]}
        title="Finance Reports"
        subtitle="Pick a question below to see the numbers behind it."
      />
    </>
  );
}
