import { Typography, Grid, Card, CardContent, Chip } from "@mui/material";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import BalanceRoundedIcon from "@mui/icons-material/BalanceRounded";
import PercentRoundedIcon from "@mui/icons-material/PercentRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import KpiCard from "@/components/KpiCard";
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

  const [pl] = await runQuery<{
    ebitda: number;
    ebitda_margin_percent: number;
  }>(`
    SELECT
      SUM(ebitda) AS ebitda,
      SUM(ebitda) / NULLIF(SUM(revenue), 0) * 100 AS ebitda_margin_percent
    FROM conformed.pl_summary;
  `);

  const monthlyRevenue = await runQuery<{ month: string; actual: number; budget: number }>(`
    SELECT
      DATE_FORMAT(date_key, '%b %Y') AS month,
      SUM(actual_revenue) AS actual,
      SUM(budget_revenue) AS budget
    FROM conformed.sales_performance
    GROUP BY date_key
    ORDER BY date_key;
  `);

  const monthlyEbitda = await runQuery<{ month: string; ebitda: number }>(`
    SELECT DATE_FORMAT(date_key, '%b %Y') AS month, ebitda
    FROM conformed.pl_summary
    ORDER BY date_key;
  `);

  return { summary, margin, finance, pl, monthlyRevenue, monthlyEbitda };
}

function fmt(n: number) {
  return `₹${(n / 1_000_000).toFixed(2)}M`;
}

export default async function OverviewPage() {
  const { summary, margin, finance, pl, monthlyRevenue, monthlyEbitda } = await getKpis();
  const variancePositive = Number(summary.revenue_variance) >= 0;
  const financeVarianceOverBudget = Number(finance.financial_variance) > 0;
  const attainment = Number(summary.attainment_percent);

  return (
    <>
      <Typography variant="h4" sx={{ mb: 0.5 }}>
        Executive Overview
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 720 }}>
        This compares what actually happened (from SAP) against what was
        planned (from Anaplan) across revenue, cost and profitability —
        updated automatically as new figures come in.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Actual Revenue" value={fmt(Number(summary.actual_revenue))} icon={PaidRoundedIcon} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Planned Revenue" value={fmt(Number(summary.budget_revenue))} icon={SavingsRoundedIcon} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Revenue vs Plan"
            value={fmt(Number(summary.revenue_variance))}
            sub={variancePositive ? "Ahead of plan" : "Behind plan"}
            positive={variancePositive}
            icon={BalanceRoundedIcon}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Plan Attainment"
            value={`${attainment.toFixed(1)}%`}
            sub={`Gross margin ${Number(margin.gross_margin_percent).toFixed(1)}%`}
            positive={attainment >= 100}
            icon={PercentRoundedIcon}
            percent={attainment}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Actual Costs" value={fmt(Number(finance.actual_amount))} icon={ReceiptLongRoundedIcon} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Planned Costs" value={fmt(Number(finance.budget_amount))} icon={AccountBalanceWalletRoundedIcon} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Cost vs Plan"
            value={fmt(Number(finance.financial_variance))}
            sub={financeVarianceOverBudget ? "Over budget" : "Under budget"}
            positive={!financeVarianceOverBudget}
            icon={BalanceRoundedIcon}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Profit (EBITDA)"
            value={fmt(Number(pl.ebitda))}
            sub={`Margin ${Number(pl.ebitda_margin_percent).toFixed(1)}%`}
            positive={Number(pl.ebitda) >= 0}
            icon={TrendingUpRoundedIcon}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <ChartCard title="Revenue: actual vs plan" subtitle="By month.">
            <GroupedBarChart
              data={monthlyRevenue.map((r) => ({ category: r.month, actual: Number(r.actual), budget: Number(r.budget) }))}
              series={[
                { key: "actual", label: "Actual" },
                { key: "budget", label: "Plan" },
              ]}
              unit="inr-millions"
            />
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <ChartCard title="Profit (EBITDA)" subtitle="By month.">
            <GroupedBarChart
              data={monthlyEbitda.map((r) => ({ category: r.month, ebitda: Number(r.ebitda) }))}
              series={[{ key: "ebitda", label: "EBITDA" }]}
              unit="inr-millions"
            />
          </ChartCard>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {[
          ["Sales data", "Actual orders and revenue from SAP"],
          ["Planning data", "Budgets, forecasts and targets from Anaplan"],
          ["Combined view", "Both sources reconciled into one model"],
          ["Ready-made reports", "16 common questions answered instantly"],
        ].map(([a, b]) => (
          <Grid item xs={12} sm={6} md={3} key={a}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1">{a}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {b}
                </Typography>
                <Chip sx={{ mt: 1.5 }} size="small" color="success" variant="outlined" label="Connected" />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
