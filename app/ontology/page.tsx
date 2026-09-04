import { Typography, Grid, Box } from "@mui/material";
import QueryRunner from "@/components/QueryRunner";
import ChartCard from "@/components/charts/ChartCard";
import DivergingBarChart from "@/components/charts/DivergingBarChart";
import GroupedBarChart from "@/components/charts/GroupedBarChart";
import GraphExplorer from "@/components/GraphExplorer";
import { runQuery } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getChartData() {
  const ppv = await runQuery<{ material_name: string; ppv: number }>(`
    SELECT material_name, SUM(ppv) AS ppv
    FROM conformed.purchase_price_variance
    GROUP BY material_name
    ORDER BY ppv DESC;
  `);

  const rootCause = await runQuery<{ driver: string; ebitda_impact: number }>(`
    SELECT driver, ebitda_impact FROM conformed.cfo_root_cause LIMIT 8;
  `);

  const inventory = await runQuery<{ product_name: string; inventory_value: number; excess_value: number }>(`
    SELECT product_name, SUM(inventory_value) AS inventory_value, SUM(excess_value) AS excess_value
    FROM conformed.inventory_exposure
    GROUP BY product_name
    ORDER BY inventory_value DESC;
  `);

  return { ppv, rootCause, inventory };
}

export default async function OntologyPage() {
  const { ppv, rootCause, inventory } = await getChartData();

  return (
    <>
      <Typography variant="h4" sx={{ mb: 0.5 }}>
        Supply Chain & Root-Cause
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        Connects finance to inventory, suppliers, production and cash — where a
        margin problem actually comes from, not just that it happened. Covers
        purchase price variance, production cost variance, inventory exposure,
        order-to-cash leakage, customer cash risk, working capital, capex
        economics, and a ranked root-cause view across every dimension at once.
      </Typography>

      <Box sx={{ mb: 4 }}>
        <ChartCard title="Ontology graph" subtitle="Live from a dedicated Neo4j container — real entities and relationships, seeded from the MySQL conformed model.">
          <GraphExplorer />
        </ChartCard>
      </Box>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <ChartCard title="Biggest EBITDA / revenue drivers" subtitle="Every plant, product, customer, cost center and GL account, ranked together.">
            <DivergingBarChart
              data={rootCause.map((r) => ({ label: r.driver, value: Number(r.ebitda_impact) }))}
              unit="inr-millions"
              positiveLabel="Helping"
              negativeLabel="Hurting"
            />
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <ChartCard title="Purchase price variance" subtitle="Standard vs actual price impact, by material.">
            <DivergingBarChart
              data={ppv.map((r) => ({ label: r.material_name, value: Number(r.ppv) }))}
              unit="inr-millions"
              invert
              positiveLabel="Over standard cost"
              negativeLabel="Under standard cost"
            />
          </ChartCard>
        </Grid>
        <Grid item xs={12}>
          <ChartCard title="Inventory value by product" subtitle="Total value vs the portion in excess of 90-day forecast demand.">
            <GroupedBarChart
              data={inventory.map((r) => ({
                category: r.product_name,
                total: Number(r.inventory_value),
                excess: Number(r.excess_value),
              }))}
              series={[
                { key: "total", label: "Total inventory value" },
                { key: "excess", label: "Excess vs demand" },
              ]}
              unit="inr-millions"
            />
          </ChartCard>
        </Grid>
      </Grid>

      <QueryRunner
        ids={[
          "cfo_root_cause",
          "purchase_price_variance",
          "production_cost_variance",
          "production_plan_attainment",
          "inventory_exposure",
          "slow_moving_inventory",
          "order_to_cash_leakage",
          "revenue_recognition",
          "customer_cash_risk",
          "ap_procurement_cash",
          "working_capital_bridge",
          "capex_economics",
          "scenario_ebitda",
        ]}
        title="Supply Chain & Root-Cause Reports"
        subtitle="Pick a question below to see the numbers behind it."
      />
    </>
  );
}
