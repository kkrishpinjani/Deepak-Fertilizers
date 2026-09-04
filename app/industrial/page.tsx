import { Grid, Card, CardContent, Typography, Stack } from "@mui/material";
import PageHeader from "@/components/PageHeader";
import QueryRunner from "@/components/QueryRunner";
import ChartCard from "@/components/charts/ChartCard";
import LineChart from "@/components/charts/LineChart";
import GroupedBarChart from "@/components/charts/GroupedBarChart";
import KpiCard from "@/components/KpiCard";
import StatusBadge from "@/components/StatusBadge";
import { runQuery } from "@/lib/db";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ThermostatRoundedIcon from "@mui/icons-material/ThermostatRounded";

export const dynamic = "force-dynamic";

async function getChartData() {
  const p220Temp = await runQuery<{ reading_time: string; value: number; warn_threshold: number; alarm_threshold: number }>(`
    SELECT reading_time, value, warn_threshold, alarm_threshold
    FROM conformed.sensor_timeseries
    WHERE asset_name = 'Pump P-220' AND sensor_type = 'TEMPERATURE'
    ORDER BY reading_time;
  `);

  const oee = await runQuery<{ process_name: string; oee_percent: number }>(`
    SELECT process_name, oee_percent FROM conformed.oee_summary ORDER BY oee_percent;
  `);

  const risk = await runQuery<any>(`
    SELECT asset_name, sensor_type, risk_level FROM conformed.predictive_maintenance_risk WHERE risk_level <> 'LOW';
  `);

  return { p220Temp, oee, risk };
}

export default async function IndustrialPage() {
  const { p220Temp, oee, risk } = await getChartData();
  const avgOee = oee.length ? oee.reduce((s, r) => s + Number(r.oee_percent), 0) / oee.length : 0;
  const latestTemp = p220Temp[p220Temp.length - 1];
  const highRisk = risk.filter((r: any) => r.risk_level === "HIGH").length;

  return (
    <>
      <PageHeader
        eyebrow="Operations · Plant & Asset Operations"
        title="Plant & Asset Operations"
        takeaway="Overall Equipment Effectiveness, predictive maintenance and energy-to-margin — the same chain of Plant → Process → Asset → Sensor connected to the finance and production data used everywhere else in this app."
        howThisWorks="There's no live PI/OSIsoft historian in this environment — sensor readings are simulated, matching the reference architecture's own 'demo data so the UI works immediately' approach. The queries, thresholds and math driving the numbers below are real."
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <KpiCard
            label="Overall Equipment Effectiveness"
            value={`${avgOee.toFixed(1)}%`}
            icon={SpeedRoundedIcon}
            status={{ tone: avgOee >= 80 ? "positive" : avgOee >= 65 ? "watch" : "critical", label: avgOee >= 80 ? "Healthy" : avgOee >= 65 ? "Needs attention" : "Critical" }}
            comparison="Availability × Performance × Quality, averaged across processes"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <KpiCard
            label="Assets Needing Attention"
            value={`${risk.length}`}
            icon={WarningAmberRoundedIcon}
            status={{ tone: highRisk > 0 ? "critical" : risk.length > 0 ? "watch" : "positive", label: highRisk > 0 ? "High risk present" : risk.length > 0 ? "Monitor closely" : "All clear" }}
            comparison={`${highRisk} high risk, ${risk.length - highRisk} elevated`}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <KpiCard
            label="Pump P-220 Temperature"
            value={latestTemp ? `${Number(latestTemp.value).toFixed(1)}°C` : "—"}
            icon={ThermostatRoundedIcon}
            comparison={latestTemp ? `Warn at ${Number(latestTemp.warn_threshold).toFixed(0)}°C · alarm at ${Number(latestTemp.alarm_threshold).toFixed(0)}°C` : undefined}
          />
        </Grid>
      </Grid>

      {risk.length > 0 && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontSize: 16, mb: 1.5 }}>
              Assets flagged by predictive maintenance
            </Typography>
            <Stack spacing={1}>
              {risk.map((r: any, i: number) => (
                <Stack key={i} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5 }}>
                  <Typography variant="body2">
                    {r.asset_name} <Typography component="span" variant="body2" color="text.secondary">— {r.sensor_type.toLowerCase()}</Typography>
                  </Typography>
                  <StatusBadge tone={r.risk_level === "HIGH" ? "critical" : "watch"} label={`${r.risk_level === "HIGH" ? "High" : "Elevated"} risk`} size="small" pill />
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <ChartCard title="Pump P-220 temperature" subtitle="Simulated sensor trend, °C — dashed lines are the warn/alarm thresholds.">
            <LineChart
              data={p220Temp.map((r) => ({ x: new Date(r.reading_time).toLocaleString(), y: Number(r.value) }))}
              warnThreshold={Number(p220Temp[0]?.warn_threshold)}
              alarmThreshold={Number(p220Temp[0]?.alarm_threshold)}
              unit="°C"
            />
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <ChartCard title="OEE by process" subtitle="Availability × Performance × Quality, %.">
            <GroupedBarChart
              data={oee.map((r) => ({ category: r.process_name, oee: Number(r.oee_percent) }))}
              series={[{ key: "oee", label: "OEE %" }]}
              unit="raw"
            />
          </ChartCard>
        </Grid>
      </Grid>

      <QueryRunner
        ids={["oee_by_process", "predictive_maintenance_risk", "energy_to_margin", "production_plan_attainment", "working_capital_bridge"]}
        title="Plant Operations Reports"
        subtitle="Pick a question below to see the numbers behind it."
      />
    </>
  );
}
