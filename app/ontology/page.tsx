import { Grid, Box, Stack, Typography } from "@mui/material";
import PageHeader from "@/components/PageHeader";
import QueryRunner from "@/components/QueryRunner";
import ChartCard from "@/components/charts/ChartCard";
import DivergingBarChart from "@/components/charts/DivergingBarChart";
import GroupedBarChart from "@/components/charts/GroupedBarChart";
import GraphExplorer from "@/components/GraphExplorer";
import RootCauseCascade from "@/components/RootCauseCascade";
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

function fmt(n: number) {
  const sign = n < 0 ? "-" : "";
  return `${sign}₹${(Math.abs(n) / 1_000_000).toFixed(2)}M`;
}

export default async function OntologyPage() {
  const { ppv, rootCause, inventory } = await getChartData();

  const worstDriver = [...rootCause].sort((a, b) => Number(a.ebitda_impact) - Number(b.ebitda_impact))[0];
  const topPpv = [...ppv].sort((a, b) => Number(b.ppv) - Number(a.ppv)).slice(0, 2);
  const topExcess = [...inventory].sort((a, b) => Number(b.excess_value) - Number(a.excess_value))[0];

  return (
    <>
      <PageHeader
        eyebrow="Operations · Supply Chain & Root-Cause"
        title="Supply Chain & Root-Cause"
        takeaway="Connects finance to inventory, suppliers, production and cash — so a margin problem shows where it actually comes from, not just that it happened."
        howThisWorks="Covers purchase price variance, production cost variance, inventory exposure, order-to-cash leakage, customer cash risk, working capital, capex economics, and a ranked root-cause view across every dimension at once — all queried live from the conformed finance and supply-chain model."
      />

      {worstDriver && (
        <Box sx={{ mb: 4 }}>
          <RootCauseCascade
            stages={[
              {
                eyebrow: "Problem",
                tone: "critical",
                content: `${worstDriver.driver} is the single largest drag on EBITDA this period.`,
              },
              {
                eyebrow: "Business impact",
                tone: "critical",
                content: `${fmt(Math.abs(Number(worstDriver.ebitda_impact)))} impact on EBITDA.`,
              },
              {
                eyebrow: "Root cause",
                tone: "watch",
                content: topPpv.length
                  ? `Purchasing ${topPpv[0].material_name} above standard cost is the leading contributor, compounded by excess inventory tying up cash.`
                  : "Cost and volume pressure across key materials is compressing margin.",
              },
              {
                eyebrow: "Contributing factors",
                content: (
                  <Stack spacing={0.4}>
                    {topPpv.map((p) => (
                      <Typography key={p.material_name} variant="body2">
                        • {p.material_name} — {fmt(Number(p.ppv))} above standard cost
                      </Typography>
                    ))}
                    {topExcess && (
                      <Typography variant="body2">
                        • {topExcess.product_name} — {fmt(Number(topExcess.excess_value))} excess inventory vs 90-day forecast demand
                      </Typography>
                    )}
                  </Stack>
                ),
              },
              {
                eyebrow: "Recommended action",
                tone: "positive",
                content: topPpv.length
                  ? `Renegotiate pricing and delivery schedule with the supplier(s) behind ${topPpv[0].material_name}, and review procurement timing to reduce purchase price variance.`
                  : "Review supplier pricing and procurement schedule.",
              },
            ]}
          />
        </Box>
      )}

      <Box sx={{ mb: 4 }}>
        <ChartCard
          title="Ontology graph"
          subtitle="Live from a dedicated Neo4j container — real entities and relationships, seeded from the conformed finance model."
        >
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
          <ChartCard title="Inventory value by product" subtitle="Total value vs the portion in excess of 90-day forecast demand, ₹ millions.">
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
