import { Typography, Grid } from "@mui/material";
import QueryRunner from "@/components/QueryRunner";
import ChartCard from "@/components/charts/ChartCard";
import GroupedBarChart from "@/components/charts/GroupedBarChart";
import DivergingBarChart from "@/components/charts/DivergingBarChart";
import { runQuery } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getChartData() {
  const byPlant = await runQuery<{ plant_name: string; actual: number; budget: number }>(`
    SELECT plant_name, SUM(actual_revenue) AS actual, SUM(budget_revenue) AS budget
    FROM conformed.sales_performance
    GROUP BY plant_name
    ORDER BY plant_name;
  `);

  const byProduct = await runQuery<{ product_name: string; variance: number }>(`
    SELECT product_name, SUM(revenue_variance) AS variance
    FROM conformed.sales_performance
    GROUP BY product_name
    ORDER BY variance ASC;
  `);

  return { byPlant, byProduct };
}

export default async function SalesPage() {
  const { byPlant, byProduct } = await getChartData();
  const money = (n: number) => `₹${(n / 1_000_000).toFixed(2)}M`;

  return (
    <>
      <Typography variant="h4" sx={{ mb: 0.5 }}>
        Sales Performance
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 720 }}>
        How actual sales compare to plan — by plant, product and customer.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <ChartCard title="Revenue by plant" subtitle="Actual vs plan.">
            <GroupedBarChart
              data={byPlant.map((r) => ({ category: r.plant_name, actual: Number(r.actual), budget: Number(r.budget) }))}
              series={[
                { key: "actual", label: "Actual" },
                { key: "budget", label: "Plan" },
              ]}
              unit="inr-millions"
            />
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <ChartCard title="Revenue variance by product" subtitle="Actual minus plan.">
            <DivergingBarChart
              data={byProduct.map((r) => ({ label: r.product_name, value: Number(r.variance) }))}
              unit="inr-millions"
            />
          </ChartCard>
        </Grid>
      </Grid>

      <QueryRunner
        ids={[
          "actual_vs_budget",
          "revenue_attainment",
          "plant_performance",
          "product_performance",
          "customer_performance",
          "revenue_miss_drivers",
          "forecast_performance",
          "gross_margin",
          "plant_margin",
        ]}
        title="Sales Reports"
        subtitle="Pick a question below to see the numbers behind it."
      />
    </>
  );
}
