import { Typography, Grid, Card, CardContent, Stack, Box } from "@mui/material";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import PercentRoundedIcon from "@mui/icons-material/PercentRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import PageHeader from "@/components/PageHeader";
import FilterBar from "@/components/FilterBar";
import KpiCard from "@/components/KpiCard";
import StatusBadge from "@/components/StatusBadge";
import AIInsightPanel from "@/components/AIInsightPanel";
import ChartCard from "@/components/charts/ChartCard";
import GroupedBarChart from "@/components/charts/GroupedBarChart";
import { runQuery } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getKpis() {
  const [summary] = await runQuery<{
    actual_revenue: number;
    budget_revenue: number;
    revenue_variance: number;
    attainment_percent: number;
  }>(`
    SELECT
      SUM(actual_revenue) AS actual_revenue,
      SUM(budget_revenue) AS budget_revenue,
      SUM(revenue_variance) AS revenue_variance,
      SUM(actual_revenue) / NULLIF(SUM(budget_revenue), 0) * 100 AS attainment_percent
    FROM conformed.sales_performance;
  `);

  const [margin] = await runQuery<{
    revenue: number;
    gross_profit: number;
    gross_margin_percent: number;
  }>(`
    SELECT
      SUM(actual_revenue) AS revenue,
      SUM(gross_profit)   AS gross_profit,
      SUM(gross_profit) / NULLIF(SUM(actual_revenue), 0) * 100 AS gross_margin_percent
    FROM conformed.sales_performance;
  `);

  const [finance] = await runQuery<{
    actual_amount: number;
    budget_amount: number;
    financial_variance: number;
  }>(`
    SELECT
      SUM(actual_amount) AS actual_amount,
      SUM(budget_amount) AS budget_amount,
      SUM(financial_variance) AS financial_variance
    FROM conformed.finance_performance;
  `);

  const [pl] = await runQuery<{ ebitda: number; ebitda_margin_percent: number }>(`
    SELECT SUM(ebitda) AS ebitda, SUM(ebitda) / NULLIF(SUM(revenue), 0) * 100 AS ebitda_margin_percent
    FROM conformed.pl_summary;
  `);

  const [workingCapital] = await runQuery<{
    total_ar: number;
    total_ap: number;
    total_inventory: number;
    cash_conversion_exposure: number;
  }>(`SELECT total_ar, total_ap, total_inventory, cash_conversion_exposure FROM conformed.working_capital_bridge;`);

  const monthlyRevenue = await runQuery<{ month: string; actual: number; budget: number }>(`
    SELECT DATE_FORMAT(date_key, '%b %Y') AS month, SUM(actual_revenue) AS actual, SUM(budget_revenue) AS budget
    FROM conformed.sales_performance
    GROUP BY date_key
    ORDER BY date_key;
  `);

  const monthlyEbitda = await runQuery<{ month: string; ebitda: number }>(`
    SELECT DATE_FORMAT(date_key, '%b %Y') AS month, ebitda
    FROM conformed.pl_summary
    ORDER BY date_key;
  `);

  const plantMovers = await runQuery<{ plant_name: string; variance: number }>(`
    SELECT plant_name, SUM(revenue_variance) AS variance
    FROM conformed.sales_performance
    GROUP BY plant_name
    ORDER BY variance ASC
    LIMIT 3;
  `);

  const costMovers = await runQuery<{ cost_center_name: string; gl_account_name: string; variance: number }>(`
    SELECT cost_center_name, gl_account_name, SUM(financial_variance) AS variance
    FROM conformed.finance_performance
    GROUP BY cost_center_name, gl_account_name
    ORDER BY variance DESC
    LIMIT 3;
  `);

  return { summary, margin, finance, pl, workingCapital, monthlyRevenue, monthlyEbitda, plantMovers, costMovers };
}

function fmt(n: number) {
  const sign = n < 0 ? "-" : "";
  return `${sign}₹${(Math.abs(n) / 1_000_000).toFixed(2)}M`;
}

export default async function OverviewPage() {
  const { summary, margin, finance, pl, workingCapital, monthlyRevenue, monthlyEbitda, plantMovers, costMovers } = await getKpis();

  const attainment = Number(summary.attainment_percent);
  const revenueVariance = Number(summary.revenue_variance);
  const costVariance = Number(finance.financial_variance);
  const overBudget = costVariance > 0;
  const ebitdaDelta = monthlyEbitda.length > 1 ? Number(monthlyEbitda[monthlyEbitda.length - 1].ebitda) - Number(monthlyEbitda[0].ebitda) : 0;

  const worstPlant = plantMovers.find((p) => Number(p.variance) < 0);
  const worstCost = costMovers.find((c) => Number(c.variance) > 0);
  const combinedEbitdaImpact = revenueVariance - costVariance;

  return (
    <>
      <PageHeader
        eyebrow="Executive Overview"
        title="How the business is performing"
        takeaway="Understand actual performance, plan variance and emerging business risks at a glance — actuals from SAP compared against the Anaplan plan, refreshed automatically as new figures land."
        howThisWorks="Every figure on this page reconciles SAP financial postings and sales billing (source of truth for actuals) against the Anaplan budget and forecast (source of truth for plan). Nothing here is estimated by AI — the numbers are queried live from the conformed finance model; the commentary is generated on top of them."
        actions={<FilterBar />}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={4}>
          <KpiCard
            label="Revenue"
            value={fmt(Number(summary.actual_revenue))}
            icon={PaidRoundedIcon}
            status={{
              tone: attainment >= 100 ? "positive" : attainment >= 95 ? "watch" : "critical",
              label: attainment >= 100 ? "On track" : "Behind plan",
            }}
            comparison={`${attainment.toFixed(1)}% of plan · ${fmt(Math.abs(revenueVariance))} ${revenueVariance >= 0 ? "above" : "below"} plan`}
            helpText="Actual billed revenue (SAP) vs the Anaplan revenue budget for the same period."
            href="/sales"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <KpiCard
            label="Costs"
            value={fmt(Number(finance.actual_amount))}
            icon={ReceiptLongRoundedIcon}
            status={{ tone: overBudget ? "watch" : "positive", label: overBudget ? "Over budget" : "Under budget" }}
            comparison={`${fmt(Math.abs(costVariance))} ${overBudget ? "above" : "below"} plan`}
            helpText="Actual OPEX + payroll + COGS-adjacent spend (SAP) vs the Anaplan cost budget."
            href="/finance"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <KpiCard
            label="EBITDA"
            value={fmt(Number(pl.ebitda))}
            icon={TrendingUpRoundedIcon}
            status={{
              tone: ebitdaDelta >= 0 ? "positive" : "watch",
              label: ebitdaDelta >= 0 ? "Improving" : "Needs attention",
            }}
            comparison={`Margin ${Number(pl.ebitda_margin_percent).toFixed(1)}% · ${ebitdaDelta >= 0 ? "up" : "down"} ${fmt(Math.abs(ebitdaDelta))} vs ${monthlyEbitda[0]?.month}`}
            helpText="Revenue minus COGS, OPEX and payroll — the profitability actually earned this period."
            href="/finance"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <KpiCard
            label="Gross Margin"
            value={`${Number(margin.gross_margin_percent).toFixed(1)}%`}
            icon={PercentRoundedIcon}
            comparison={`${fmt(Number(margin.gross_profit))} gross profit on ${fmt(Number(margin.revenue))} revenue`}
            helpText="Gross profit (revenue minus cost of goods sold) as a percentage of revenue."
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <KpiCard
            label="Working Capital"
            value={fmt(Number(workingCapital.cash_conversion_exposure))}
            icon={AccountBalanceWalletRoundedIcon}
            status={{ tone: "info", label: "Cash tied up" }}
            comparison={`Receivables ${fmt(Number(workingCapital.total_ar))} + inventory ${fmt(Number(workingCapital.total_inventory))} − payables ${fmt(Number(workingCapital.total_ap))}`}
            helpText="Cash currently tied up in the business: receivables plus inventory, minus what's owed to suppliers."
            href="/planning"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <KpiCard
            label="Plan Attainment"
            value={`${attainment.toFixed(1)}%`}
            icon={SpeedRoundedIcon}
            percent={attainment}
            status={{
              tone: attainment >= 100 ? "positive" : attainment >= 95 ? "watch" : "critical",
              label: attainment >= 100 ? "At or above target" : "Below target",
            }}
            comparison="vs 100% of the full-year revenue target"
            helpText="Actual revenue achieved so far as a share of the planned revenue target."
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={7}>
          <AIInsightPanel
            summary={
              <>
                Revenue is{" "}
                <strong>{attainment >= 100 ? `${(attainment - 100).toFixed(1)}% above plan` : `${(100 - attainment).toFixed(1)}% below plan`}</strong>
                {worstPlant ? (
                  <>
                    , primarily driven by weaker performance at <strong>{worstPlant.plant_name}</strong>
                  </>
                ) : null}
                {worstCost ? (
                  <>
                    . Higher spend on <strong>{worstCost.gl_account_name}</strong> at {worstCost.cost_center_name} is also putting pressure on EBITDA.
                  </>
                ) : (
                  "."
                )}
              </>
            }
            drivers={[
              ...plantMovers
                .filter((p) => Number(p.variance) < 0)
                .slice(0, 2)
                .map((p) => ({
                  label: `${p.plant_name} revenue`,
                  detail: `${fmt(Math.abs(Number(p.variance)))} below plan`,
                  tone: "critical" as const,
                })),
              ...costMovers
                .filter((c) => Number(c.variance) > 0)
                .slice(0, 2)
                .map((c) => ({
                  label: `${c.gl_account_name} · ${c.cost_center_name}`,
                  detail: `${fmt(Number(c.variance))} over budget`,
                  tone: "critical" as const,
                })),
            ]}
            impact={`Combined effect on EBITDA: approximately ${fmt(Math.abs(combinedEbitdaImpact))} ${combinedEbitdaImpact >= 0 ? "favorable" : "unfavorable"} vs plan.`}
            action={
              worstPlant || worstCost
                ? `Review ${worstPlant ? `pricing and volume at ${worstPlant.plant_name}` : ""}${worstPlant && worstCost ? " and " : ""}${
                    worstCost ? `spend on ${worstCost.gl_account_name} at ${worstCost.cost_center_name}` : ""
                  }.`
                : "No material variance drivers this period — continue monitoring."
            }
            evidence={
              <Stack spacing={0.75}>
                {plantMovers.map((p) => (
                  <Typography key={p.plant_name} variant="body2" color="text.secondary">
                    {p.plant_name} revenue variance: {fmt(Number(p.variance))}
                  </Typography>
                ))}
                {costMovers.map((c, i) => (
                  <Typography key={i} variant="body2" color="text.secondary">
                    {c.cost_center_name} — {c.gl_account_name} cost variance: {fmt(Number(c.variance))}
                  </Typography>
                ))}
              </Stack>
            }
          />
        </Grid>
        <Grid item xs={12} lg={5}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontSize: 16, mb: 1.5 }}>
                Connected data sources
              </Typography>
              <Stack spacing={1.5}>
                {[
                  ["Sales data", "Actual orders and revenue, live from SAP"],
                  ["Planning data", "Budgets, forecasts and targets, live from Anaplan"],
                  ["Combined view", "Both sources reconciled into one finance model"],
                  ["Ready-made reports", "16 common questions answered instantly"],
                ].map(([a, b]) => (
                  <Stack key={a} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5 }}>
                    <Box>
                      <Typography variant="body2" fontWeight={650}>
                        {a}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {b}
                      </Typography>
                    </Box>
                    <StatusBadge tone="positive" label="Connected" size="small" />
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <ChartCard title="Revenue: actual vs plan" subtitle="Monthly, in ₹ millions. The outlined bar is the Anaplan plan.">
            <GroupedBarChart
              data={monthlyRevenue.map((r) => ({ category: r.month, actual: Number(r.actual), budget: Number(r.budget) }))}
              series={[
                { key: "actual", label: "Actual" },
                { key: "budget", label: "Plan", variant: "ghost" },
              ]}
              unit="inr-millions"
            />
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <ChartCard title="EBITDA trend" subtitle="Monthly profit after cost of goods, operating expense and payroll.">
            <GroupedBarChart
              data={monthlyEbitda.map((r) => ({ category: r.month, ebitda: Number(r.ebitda) }))}
              series={[{ key: "ebitda", label: "EBITDA" }]}
              unit="inr-millions"
            />
          </ChartCard>
        </Grid>
      </Grid>
    </>
  );
}
