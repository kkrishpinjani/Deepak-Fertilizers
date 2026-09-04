import { Typography, Grid, Card, CardContent, Stack, Box, Alert } from "@mui/material";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import PercentRoundedIcon from "@mui/icons-material/PercentRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import PageHeader from "@/components/PageHeader";
import FilterBar, { type FilterDef } from "@/components/FilterBar";
import KpiCard from "@/components/KpiCard";
import StatusBadge from "@/components/StatusBadge";
import AIInsightPanel from "@/components/AIInsightPanel";
import ChartCard from "@/components/charts/ChartCard";
import GroupedBarChart from "@/components/charts/GroupedBarChart";
import { runQuery, runParamQuery } from "@/lib/db";
import { VERIFIED_QUERIES } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Filters = { period: string; plant: string; region: string; product: string };

const ALL = "All";

function readFilters(searchParams: Record<string, string | string[] | undefined>): Filters {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || ALL;
  return {
    period: one(searchParams.period),
    plant: one(searchParams.plant),
    region: one(searchParams.region),
    product: one(searchParams.product),
  };
}

// sales_performance is the only table with plant/region/product dimensions —
// finance_performance, pl_summary and working_capital_bridge have none, so
// those filters can only ever narrow the sales-sourced figures below.
function salesWhere(f: Filters) {
  const clauses: string[] = [];
  const params: any[] = [];
  if (f.period !== ALL) {
    clauses.push("DATE_FORMAT(date_key, '%b %Y') = ?");
    params.push(f.period);
  }
  if (f.plant !== ALL) {
    clauses.push("plant_name = ?");
    params.push(f.plant);
  }
  if (f.region !== ALL) {
    clauses.push("sales_region = ?");
    params.push(f.region);
  }
  if (f.product !== ALL) {
    clauses.push("product_name = ?");
    params.push(f.product);
  }
  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

// finance_performance and pl_summary only carry a date dimension.
function periodOnlyWhere(f: Filters) {
  if (f.period === ALL) return { where: "", params: [] as any[] };
  return { where: "WHERE DATE_FORMAT(date_key, '%b %Y') = ?", params: [f.period] };
}

async function getFilterOptions(): Promise<FilterDef[]> {
  const [periodRows, plants, regions, products] = await Promise.all([
    // Group by the formatted label but order by the real date, so "Jan 2026"
    // always sorts before "Feb 2026" regardless of string order.
    runQuery<{ period: string; d: string }>(
      `SELECT DATE_FORMAT(date_key, '%b %Y') AS period, MIN(date_key) AS d FROM conformed.sales_performance GROUP BY period ORDER BY d`
    ),
    runQuery<{ plant_name: string }>(`SELECT DISTINCT plant_name FROM conformed.sales_performance ORDER BY plant_name`),
    runQuery<{ sales_region: string }>(`SELECT DISTINCT sales_region FROM conformed.sales_performance ORDER BY sales_region`),
    runQuery<{ product_name: string }>(`SELECT DISTINCT product_name FROM conformed.sales_performance ORDER BY product_name`),
  ]);
  return [
    { key: "period", label: "Period", options: periodRows.map((r) => r.period) },
    { key: "plant", label: "Plant", options: plants.map((p) => p.plant_name) },
    { key: "region", label: "Region", options: regions.map((r) => r.sales_region) },
    { key: "product", label: "Product", options: products.map((p) => p.product_name) },
  ];
}

async function getKpis(filters: Filters) {
  const sales = salesWhere(filters);
  const finance = periodOnlyWhere(filters);

  const [summary] = await runParamQuery<{
    actual_revenue: number;
    budget_revenue: number;
    revenue_variance: number;
    attainment_percent: number;
  }>(
    `SELECT
      SUM(actual_revenue) AS actual_revenue,
      SUM(budget_revenue) AS budget_revenue,
      SUM(revenue_variance) AS revenue_variance,
      SUM(actual_revenue) / NULLIF(SUM(budget_revenue), 0) * 100 AS attainment_percent
    FROM conformed.sales_performance ${sales.where};`,
    sales.params
  );

  const [margin] = await runParamQuery<{
    revenue: number;
    gross_profit: number;
    gross_margin_percent: number;
  }>(
    `SELECT
      SUM(actual_revenue) AS revenue,
      SUM(gross_profit)   AS gross_profit,
      SUM(gross_profit) / NULLIF(SUM(actual_revenue), 0) * 100 AS gross_margin_percent
    FROM conformed.sales_performance ${sales.where};`,
    sales.params
  );

  const [financeRow] = await runParamQuery<{
    actual_amount: number;
    budget_amount: number;
    financial_variance: number;
  }>(
    `SELECT
      SUM(actual_amount) AS actual_amount,
      SUM(budget_amount) AS budget_amount,
      SUM(financial_variance) AS financial_variance
    FROM conformed.finance_performance ${finance.where};`,
    finance.params
  );

  const [pl] = await runParamQuery<{ ebitda: number; ebitda_margin_percent: number }>(
    `SELECT SUM(ebitda) AS ebitda, SUM(ebitda) / NULLIF(SUM(revenue), 0) * 100 AS ebitda_margin_percent
    FROM conformed.pl_summary ${finance.where};`,
    finance.params
  );

  // No dimensions or dates on this table at all — it's a single point-in-time
  // bridge, so it stays company-wide and unfiltered regardless of selection.
  const [workingCapital] = await runQuery<{
    total_ar: number;
    total_ap: number;
    total_inventory: number;
    cash_conversion_exposure: number;
  }>(`SELECT total_ar, total_ap, total_inventory, cash_conversion_exposure FROM conformed.working_capital_bridge;`);

  const monthlyRevenue = await runParamQuery<{ month: string; actual: number; budget: number }>(
    `SELECT DATE_FORMAT(date_key, '%b %Y') AS month, SUM(actual_revenue) AS actual, SUM(budget_revenue) AS budget
    FROM conformed.sales_performance ${sales.where}
    GROUP BY date_key
    ORDER BY date_key;`,
    sales.params
  );

  const monthlyEbitda = await runParamQuery<{ month: string; ebitda: number }>(
    `SELECT DATE_FORMAT(date_key, '%b %Y') AS month, ebitda
    FROM conformed.pl_summary ${finance.where}
    ORDER BY date_key;`,
    finance.params
  );

  const plantMovers = await runParamQuery<{ plant_name: string; variance: number }>(
    `SELECT plant_name, SUM(revenue_variance) AS variance
    FROM conformed.sales_performance ${sales.where}
    GROUP BY plant_name
    ORDER BY variance ASC
    LIMIT 3;`,
    sales.params
  );

  const costMovers = await runParamQuery<{ cost_center_name: string; gl_account_name: string; variance: number }>(
    `SELECT cost_center_name, gl_account_name, SUM(financial_variance) AS variance
    FROM conformed.finance_performance ${finance.where}
    GROUP BY cost_center_name, gl_account_name
    ORDER BY variance DESC
    LIMIT 3;`,
    finance.params
  );

  return { summary, margin, finance: financeRow, pl, workingCapital, monthlyRevenue, monthlyEbitda, plantMovers, costMovers };
}

function fmt(n: number) {
  const sign = n < 0 ? "-" : "";
  return `${sign}₹${(Math.abs(n) / 1_000_000).toFixed(2)}M`;
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = readFilters(searchParams);
  const scopedToSalesOnly = filters.plant !== ALL || filters.region !== ALL || filters.product !== ALL;

  const [filterOptions, { summary, margin, finance, pl, workingCapital, monthlyRevenue, monthlyEbitda, plantMovers, costMovers }] =
    await Promise.all([getFilterOptions(), getKpis(filters)]);

  const attainment = Number(summary.attainment_percent) || 0;
  const revenueVariance = Number(summary.revenue_variance) || 0;
  const costVariance = Number(finance.financial_variance) || 0;
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
        howThisWorks="Every figure on this page reconciles SAP financial postings and sales billing (source of truth for actuals) against the Anaplan budget and forecast (source of truth for plan). Nothing here is estimated by AI — the numbers are queried live from the conformed finance model; the commentary is generated on top of them. Period, Plant, Region and Product filters narrow the underlying SQL directly — there is no Business Unit filter because the source data has no business-unit dimension to filter by."
        actions={<FilterBar filters={filterOptions} />}
      />

      {scopedToSalesOnly && (
        <Alert severity="info" variant="outlined" sx={{ mb: 3 }}>
          Plant, region and product filters narrow Revenue, Gross Margin, Plan Attainment and the charts below — Costs,
          EBITDA and Working Capital have no plant/region/product breakdown in the source data, so those three stay
          company-wide.
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={4}>
          <KpiCard
            label="Revenue"
            value={fmt(Number(summary.actual_revenue) || 0)}
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
            value={fmt(Number(finance.actual_amount) || 0)}
            icon={ReceiptLongRoundedIcon}
            status={{ tone: overBudget ? "watch" : "positive", label: overBudget ? "Over budget" : "Under budget" }}
            comparison={`${fmt(Math.abs(costVariance))} ${overBudget ? "above" : "below"} plan${scopedToSalesOnly ? " · company-wide" : ""}`}
            helpText="Actual OPEX + payroll + COGS-adjacent spend (SAP) vs the Anaplan cost budget. Not broken down by plant, region or product in the source data."
            href="/finance"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <KpiCard
            label="EBITDA"
            value={fmt(Number(pl.ebitda) || 0)}
            icon={TrendingUpRoundedIcon}
            status={{
              tone: ebitdaDelta >= 0 ? "positive" : "watch",
              label: ebitdaDelta >= 0 ? "Improving" : "Needs attention",
            }}
            comparison={`Margin ${(Number(pl.ebitda_margin_percent) || 0).toFixed(1)}% · ${ebitdaDelta >= 0 ? "up" : "down"} ${fmt(Math.abs(ebitdaDelta))} vs ${monthlyEbitda[0]?.month ?? "—"}${scopedToSalesOnly ? " · company-wide" : ""}`}
            helpText="Revenue minus COGS, OPEX and payroll — the profitability actually earned this period. Not broken down by plant, region or product in the source data."
            href="/finance"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <KpiCard
            label="Gross Margin"
            value={`${(Number(margin.gross_margin_percent) || 0).toFixed(1)}%`}
            icon={PercentRoundedIcon}
            comparison={`${fmt(Number(margin.gross_profit) || 0)} gross profit on ${fmt(Number(margin.revenue) || 0)} revenue`}
            helpText="Gross profit (revenue minus cost of goods sold) as a percentage of revenue."
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <KpiCard
            label="Working Capital"
            value={fmt(Number(workingCapital.cash_conversion_exposure) || 0)}
            icon={AccountBalanceWalletRoundedIcon}
            status={{ tone: "info", label: "Cash tied up" }}
            comparison={`Receivables ${fmt(Number(workingCapital.total_ar) || 0)} + inventory ${fmt(Number(workingCapital.total_inventory) || 0)} − payables ${fmt(Number(workingCapital.total_ap) || 0)}${scopedToSalesOnly ? " · company-wide" : ""}`}
            helpText="Cash currently tied up in the business: receivables plus inventory, minus what's owed to suppliers. A single company-wide snapshot — not broken down by plant, region, product or period in the source data."
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
          {plantMovers.length === 0 && costMovers.length === 0 ? (
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardContent>
                <StatusBadge tone="neutral" label="No data available for the selected filters" />
              </CardContent>
            </Card>
          ) : (
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
          )}
        </Grid>
        <Grid item xs={12} lg={5}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontSize: 16, mb: 1.5 }}>
                Connected data sources
              </Typography>
              <Stack spacing={1.5}>
                {[
                  {
                    a: "Sales data",
                    b: "Actual orders and revenue, live from SAP",
                    connected: Number(summary.actual_revenue) > 0,
                  },
                  {
                    a: "Planning data",
                    b: "Budgets, forecasts and targets, live from Anaplan",
                    connected: Number(summary.budget_revenue) > 0,
                  },
                  {
                    a: "Combined view",
                    b: "Both sources reconciled into one finance model",
                    connected: Number(summary.actual_revenue) > 0 && Number(summary.budget_revenue) > 0,
                  },
                ].map(({ a, b, connected }) => (
                  <Stack key={a} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5 }}>
                    <Box>
                      <Typography variant="body2" fontWeight={650}>
                        {a}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {b}
                      </Typography>
                    </Box>
                    <StatusBadge
                      tone={connected ? "positive" : "neutral"}
                      label={connected ? "Connected" : "No data returned"}
                      size="small"
                    />
                  </Stack>
                ))}
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5 }}>
                  <Box>
                    <Typography variant="body2" fontWeight={650}>
                      Ready-made reports
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Verified questions answered instantly, no AI guessing required
                    </Typography>
                  </Box>
                  <StatusBadge tone="info" label={`${VERIFIED_QUERIES.length} available`} size="small" />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <ChartCard title="Revenue: actual vs plan" subtitle="Monthly, in ₹ millions. The outlined bar is the Anaplan plan.">
            {monthlyRevenue.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No data available for the selected filters.
              </Typography>
            ) : (
              <GroupedBarChart
                data={monthlyRevenue.map((r) => ({ category: r.month, actual: Number(r.actual), budget: Number(r.budget) }))}
                series={[
                  { key: "actual", label: "Actual" },
                  { key: "budget", label: "Plan", variant: "ghost" },
                ]}
                unit="inr-millions"
              />
            )}
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <ChartCard title="EBITDA trend" subtitle="Monthly profit after cost of goods, operating expense and payroll.">
            {monthlyEbitda.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No data available for the selected filters.
              </Typography>
            ) : (
              <GroupedBarChart
                data={monthlyEbitda.map((r) => ({ category: r.month, ebitda: Number(r.ebitda) }))}
                series={[{ key: "ebitda", label: "EBITDA" }]}
                unit="inr-millions"
              />
            )}
          </ChartCard>
        </Grid>
      </Grid>
    </>
  );
}
