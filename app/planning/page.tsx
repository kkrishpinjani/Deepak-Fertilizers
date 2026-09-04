import { Grid, Typography, Divider } from "@mui/material";
import PageHeader from "@/components/PageHeader";
import QueryRunner from "@/components/QueryRunner";
import ChartCard from "@/components/charts/ChartCard";
import GroupedBarChart from "@/components/charts/GroupedBarChart";
import KpiCard from "@/components/KpiCard";
import { runQuery } from "@/lib/db";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import RequestQuoteRoundedIcon from "@mui/icons-material/RequestQuoteRounded";

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
    SELECT DATE_FORMAT(date_key, '%b %Y') AS month, accounts_receivable, accounts_payable, inventory
    FROM conformed.working_capital_summary
    ORDER BY date_key;
  `);

  return { headcount, workingCapital };
}

function fmt(n: number) {
  return `₹${(n / 1_000_000).toFixed(2)}M`;
}

export default async function PlanningPage() {
  const { headcount, workingCapital } = await getChartData();
  const totalHeadcount = headcount.reduce((s, r) => s + Number(r.planned_headcount), 0);
  const latest = workingCapital[workingCapital.length - 1];
  const first = workingCapital[0];
  const netWC = latest ? Number(latest.accounts_receivable) + Number(latest.inventory) - Number(latest.accounts_payable) : 0;
  const arChangePct = latest && first ? ((Number(latest.accounts_receivable) - Number(first.accounts_receivable)) / Number(first.accounts_receivable)) * 100 : 0;

  return (
    <>
      <PageHeader
        eyebrow="Finance · Headcount & Working Capital"
        title="Headcount & Working Capital"
        takeaway="Two distinct plans from Anaplan, shown separately so they're never confused: planned staffing costs, and the cash tied up in receivables, payables and inventory."
        howThisWorks="Both sections are plan-only — there's no SAP actual to reconcile against yet for headcount or working capital, so every figure here is the Anaplan budget, not an actual."
      />

      <Typography variant="overline" color="text.secondary" sx={{ display: "block", mb: 1 }}>
        Headcount
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard label="Planned Headcount" value={totalHeadcount.toLocaleString()} icon={GroupsRoundedIcon} comparison={`Across ${headcount.length} cost centers`} />
        </Grid>
      </Grid>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <ChartCard title="Planned headcount by cost center" subtitle="Latest planning month, number of people.">
            <GroupedBarChart
              data={headcount.map((r) => ({ category: r.cost_center_name, headcount: Number(r.planned_headcount) }))}
              series={[{ key: "headcount", label: "Planned headcount" }]}
              unit="headcount"
            />
          </ChartCard>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 4 }} />

      <Typography variant="overline" color="text.secondary" sx={{ display: "block", mb: 1 }}>
        Working Capital
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            label="Net Working Capital"
            value={fmt(netWC)}
            icon={RequestQuoteRoundedIcon}
            comparison={latest ? `As of ${latest.month}` : undefined}
            helpText="Receivables plus inventory, minus payables — cash currently tied up in day-to-day operations."
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            label="Receivables"
            value={latest ? fmt(Number(latest.accounts_receivable)) : "—"}
            icon={PaymentsRoundedIcon}
            status={Math.abs(arChangePct) >= 2 ? { tone: arChangePct > 0 ? "watch" : "positive", label: arChangePct > 0 ? "Increasing" : "Decreasing" } : undefined}
            comparison={workingCapital.length > 1 ? `${arChangePct >= 0 ? "Up" : "Down"} ${Math.abs(arChangePct).toFixed(1)}% since ${first.month}` : undefined}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard label="Payables" value={latest ? fmt(Number(latest.accounts_payable)) : "—"} icon={RequestQuoteRoundedIcon} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard label="Inventory" value={latest ? fmt(Number(latest.inventory)) : "—"} icon={Inventory2RoundedIcon} />
        </Grid>
      </Grid>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <ChartCard title="Working capital by month" subtitle="Receivables, payables and inventory, ₹ millions.">
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

      <QueryRunner ids={["headcount_by_cost_center", "working_capital"]} title="Planning Reports" subtitle="Pick a question below to see the numbers behind it." />
    </>
  );
}
