import { Typography, Grid, Chip, Stack } from "@mui/material";
import QueryRunner from "@/components/QueryRunner";
import ChartCard from "@/components/charts/ChartCard";
import LineChart from "@/components/charts/LineChart";
import GroupedBarChart from "@/components/charts/GroupedBarChart";
import { runQuery } from "@/lib/db";

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

  return (
    <>
      <Typography variant="h4" sx={{ mb: 0.5 }}>
        Plant & Asset Operations
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1, maxWidth: 760 }}>
        Overall Equipment Effectiveness, predictive maintenance, and
        energy-to-margin — the ontology chain Plant → Process → Asset →
        Sensor → Event, connected to the same SAP production and finance
        data as the rest of this app.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        There's no real PI/OSIsoft historian here — this is simulated sensor
        data in MySQL, same as the doc's own V3 package ships ("demo data so
        the UI works immediately"). The queries and math are real.
      </Typography>

      {risk.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
          {risk.map((r: any, i: number) => (
            <Chip
              key={i}
              color={r.risk_level === "HIGH" ? "error" : "warning"}
              label={`${r.asset_name} — ${r.sensor_type} — ${r.risk_level} risk`}
            />
          ))}
        </Stack>
      )}

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <ChartCard title="Pump P-220 temperature" subtitle="Live sensor trend — dashed lines are warn/alarm thresholds.">
            <LineChart
              data={p220Temp.map((r) => ({ x: new Date(r.reading_time).toLocaleString(), y: Number(r.value) }))}
              warnThreshold={Number(p220Temp[0]?.warn_threshold)}
              alarmThreshold={Number(p220Temp[0]?.alarm_threshold)}
              unit="°C"
            />
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <ChartCard title="OEE by process" subtitle="Availability × Performance × Quality.">
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
