import { Grid } from "@mui/material";
import PageHeader from "@/components/PageHeader";
import QueryRunner from "@/components/QueryRunner";
import ChartCard from "@/components/charts/ChartCard";
import GroupedBarChart from "@/components/charts/GroupedBarChart";
import DivergingBarChart from "@/components/charts/DivergingBarChart";
import WaterfallChart from "@/components/charts/WaterfallChart";
import KpiCard from "@/components/KpiCard";
import AIInsightPanel from "@/components/AIInsightPanel";
import { runQuery } from "@/lib/db";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import PercentRoundedIcon from "@mui/icons-material/PercentRounded";

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

  const [pl] = await runQuery<{ ebitda: number; ebitda_margin_percent: number }>(`
    SELECT SUM(ebitda) AS ebitda, SUM(ebitda) / NULLIF(SUM(revenue), 0) * 100 AS ebitda_margin_percent
    FROM conformed.pl_summary;
  `);

  const [sales] = await runQuery<{ revenue: number; budget_revenue: number; revenue_variance: number; gross_margin_percent: number }>(`
    SELECT SUM(actual_revenue) AS revenue, SUM(budget_revenue) AS budget_revenue, SUM(revenue_variance) AS revenue_variance,
           SUM(gross_profit) / NULLIF(SUM(actual_revenue), 0) * 100 AS gross_margin_percent
    FROM conformed.sales_performance;
  `);

  return { byAccount, byCostCenter, pl, sales };
}

function fmt(n: number) {
  const sign = n < 0 ? "-" : "";
  return `${sign}₹${(Math.abs(n) / 1_000_000).toFixed(2)}M`;
}

export default async function FinancePage() {
  const { byAccount, byCostCenter, pl, sales } = await getChartData();

  const costVarianceTotal = byAccount.reduce((s, r) => s + (Number(r.actual) - Number(r.budget)), 0);
  const revenueVariance = Number(sales.revenue_variance);
  const actualEbitda = Number(pl.ebitda);
  const planEbitda = actualEbitda - revenueVariance + costVarianceTotal;

  const accountVariances = byAccount
    .map((r) => ({ label: r.gl_account_name, variance: Number(r.actual) - Number(r.budget) }))
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
  const topAccounts = accountVariances.slice(0, 3);
  const residual = costVarianceTotal - topAccounts.reduce((s, a) => s + a.variance, 0);

  const bridgeSteps = [
    { label: "Revenue vs plan", value: revenueVariance },
    ...topAccounts.map((a) => ({ label: a.label, value: -a.variance })),
    ...(Math.abs(residual) > 1 ? [{ label: "Other accounts", value: -residual }] : []),
  ];

  const worstCost = topAccounts.find((a) => a.variance > 0);
  const totalActualCost = byAccount.reduce((s, r) => s + Number(r.actual), 0);
  const totalBudgetCost = byAccount.reduce((s, r) => s + Number(r.budget), 0);

  return (
    <>
      <PageHeader
        eyebrow="Finance · Finance & Profitability"
        title="Finance & Profitability"
        takeaway="Actual costs against budget, monthly profitability, and exactly what moved EBITDA between plan and actual — broken down by cost center and account."
        howThisWorks="Actuals come from SAP financial postings; plan and forecast come from Anaplan. The EBITDA bridge below decomposes the gap between the Anaplan plan and the actual result into revenue performance and the specific GL accounts that overspent or underspent."
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard label="Actual Cost" value={fmt(totalActualCost)} icon={ReceiptLongRoundedIcon} comparison={`Plan: ${fmt(totalBudgetCost)}`} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            label="Cost vs Plan"
            value={fmt(Math.abs(costVarianceTotal))}
            icon={PaidRoundedIcon}
            status={{ tone: costVarianceTotal > 0 ? "watch" : "positive", label: costVarianceTotal > 0 ? "Over budget" : "Under budget" }}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            label="EBITDA"
            value={fmt(actualEbitda)}
            icon={TrendingUpRoundedIcon}
            comparison={`Plan: ${fmt(planEbitda)}`}
            status={{ tone: actualEbitda >= planEbitda ? "positive" : "watch", label: actualEbitda >= planEbitda ? "Ahead of plan" : "Behind plan" }}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard label="Gross Margin" value={`${Number(sales.gross_margin_percent).toFixed(1)}%`} icon={PercentRoundedIcon} />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <ChartCard
            title="EBITDA bridge: plan to actual"
            subtitle="What moved profitability from the Anaplan plan to the actual result, ₹ millions."
            footnote="Green bars help EBITDA, red bars hurt it — the two end bars are totals, not variances."
          >
            <WaterfallChart startLabel="Plan EBITDA" startValue={planEbitda} steps={bridgeSteps} endLabel="Actual EBITDA" unit="inr-millions" />
          </ChartCard>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <ChartCard title="Cost by account" subtitle="Actual vs plan, ₹ millions. The outlined bar is the Anaplan plan.">
            <GroupedBarChart
              data={byAccount.map((r) => ({ category: r.gl_account_name, actual: Number(r.actual), budget: Number(r.budget) }))}
              series={[
                { key: "actual", label: "Actual" },
                { key: "budget", label: "Plan", variant: "ghost" },
              ]}
              unit="inr-millions"
            />
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <ChartCard title="Cost variance by cost center" subtitle="Actual minus plan, ₹ millions — over plan runs red.">
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

      {worstCost && (
        <div style={{ marginBottom: 24 }}>
          <AIInsightPanel
            summary={
              <>
                EBITDA is {fmt(Math.abs(actualEbitda - planEbitda))} {actualEbitda >= planEbitda ? "ahead of" : "behind"} plan. The largest single
                driver is <strong>{worstCost.label}</strong>, running {fmt(worstCost.variance)} over budget.
              </>
            }
            drivers={topAccounts.map((a) => ({
              label: a.label,
              detail: `${fmt(Math.abs(a.variance))} ${a.variance > 0 ? "over" : "under"} budget`,
              tone: a.variance > 0 ? ("critical" as const) : ("positive" as const),
            }))}
            impact={`Net effect on EBITDA vs plan: ${fmt(Math.abs(actualEbitda - planEbitda))} ${actualEbitda >= planEbitda ? "favorable" : "unfavorable"}.`}
            action={`Review procurement and cost control for ${worstCost.label} before the next planning cycle.`}
          />
        </div>
      )}

      <QueryRunner ids={["budget_vs_actual_finance", "budget_by_cost_center", "ebitda", "revenue_usd"]} title="Finance Reports" subtitle="Pick a question below to see the numbers behind it." />
    </>
  );
}
