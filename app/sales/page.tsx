import { Grid, Breadcrumbs, Typography } from "@mui/material";
import PageHeader from "@/components/PageHeader";
import QueryRunner from "@/components/QueryRunner";
import ChartCard from "@/components/charts/ChartCard";
import GroupedBarChart from "@/components/charts/GroupedBarChart";
import DivergingBarChart from "@/components/charts/DivergingBarChart";
import AIInsightPanel from "@/components/AIInsightPanel";
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

function fmt(n: number) {
  const sign = n < 0 ? "-" : "";
  return `${sign}₹${(Math.abs(n) / 1_000_000).toFixed(2)}M`;
}

export default async function SalesPage() {
  const { byPlant, byProduct } = await getChartData();

  const worstPlant = [...byPlant].sort((a, b) => Number(a.actual) - Number(a.budget) - (Number(b.actual) - Number(b.budget)))[0];
  const worstProduct = byProduct[0];
  const bestProduct = byProduct[byProduct.length - 1];

  return (
    <>
      <PageHeader
        eyebrow="Commercial · Sales Performance"
        title="Sales Performance"
        takeaway="How actual sales compare to plan — drill from the company total down to plant, product and customer to find exactly where revenue is being won or lost."
      />

      <Breadcrumbs separator="›" sx={{ mb: 2.5 }}>
        <Typography variant="body2" color="text.primary" fontWeight={650}>
          Company
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Business Unit
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Region
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Product
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Customer
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Transaction
        </Typography>
      </Breadcrumbs>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <ChartCard title="Revenue by plant" subtitle="Actual vs plan, ₹ millions. The outlined bar is the Anaplan plan.">
            <GroupedBarChart
              data={byPlant.map((r) => ({ category: r.plant_name, actual: Number(r.actual), budget: Number(r.budget) }))}
              series={[
                { key: "actual", label: "Actual" },
                { key: "budget", label: "Plan", variant: "ghost" },
              ]}
              unit="inr-millions"
            />
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <ChartCard title="Revenue variance by product" subtitle="Actual minus plan, ₹ millions.">
            <DivergingBarChart data={byProduct.map((r) => ({ label: r.product_name, value: Number(r.variance) }))} unit="inr-millions" />
          </ChartCard>
        </Grid>
      </Grid>

      {worstProduct && Number(worstProduct.variance) < 0 && (
        <div style={{ marginBottom: 24 }}>
          <AIInsightPanel
            summary={
              <>
                <strong>{worstProduct.product_name}</strong> is the largest drag on revenue, {fmt(Math.abs(Number(worstProduct.variance)))} below
                plan{worstPlant ? (
                  <>
                    {" "}
                    — concentrated at <strong>{worstPlant.plant_name}</strong>
                  </>
                ) : null}
                . {bestProduct && Number(bestProduct.variance) > 0 ? (
                  <>
                    <strong>{bestProduct.product_name}</strong> is partly offsetting it, running {fmt(Number(bestProduct.variance))} ahead of plan.
                  </>
                ) : null}
              </>
            }
            drivers={byProduct
              .filter((p) => Number(p.variance) < 0)
              .slice(0, 3)
              .map((p) => ({ label: p.product_name, detail: `${fmt(Math.abs(Number(p.variance)))} below plan`, tone: "critical" as const }))}
            action={`Review pricing, volume commitments and customer mix for ${worstProduct.product_name}${worstPlant ? ` at ${worstPlant.plant_name}` : ""}.`}
          />
        </div>
      )}

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
        subtitle="Pick a question below to see the exact numbers and transactions behind it."
      />
    </>
  );
}
