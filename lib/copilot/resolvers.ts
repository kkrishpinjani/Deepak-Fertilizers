// Maps each intent to a real SQL query against the conformed model and
// a common {kpiName, actual, plan, rows[]} shape the rest of the copilot
// engine consumes. This is the part v17 left to a live Cortex Analyst
// call — here it's real MySQL against the tables this project already
// built, since there's no Snowflake/Cortex Analyst account available.

import { runQuery } from "@/lib/db";
import { Intent } from "./intent";

export type DriverRow = { dimension: string; actual: number; plan: number; variance: number };

export type ResolvedAnswer = {
  kpiName: string;
  unit: string;
  actual: number;
  plan: number;
  rows: DriverRow[];
  sql: string;
  sources: string[];
};

async function ebitdaRootCause(): Promise<ResolvedAnswer> {
  const [pl] = await runQuery<{ base_ebitda: number }>(`
    SELECT SUM(ebitda) AS base_ebitda FROM conformed.pl_summary;
  `);
  const sql = `
    SELECT driver AS dimension, ebitda_impact AS variance
    FROM conformed.cfo_root_cause
    LIMIT 10;
  `;
  const drivers = await runQuery<{ dimension: string; variance: number }>(sql);
  const actual = Number(pl.base_ebitda);
  return {
    kpiName: "EBITDA",
    unit: "inr-millions",
    actual,
    plan: actual - drivers.reduce((s, d) => s + Number(d.variance), 0),
    rows: drivers.map((d) => ({ dimension: d.dimension, actual: 0, plan: 0, variance: Number(d.variance) })),
    sql,
    sources: ["SAP S/4HANA", "Anaplan", "MySQL (conformed)"],
  };
}

async function arRisk(): Promise<ResolvedAnswer> {
  const sql = `
    SELECT customer_name AS dimension, overdue_ar
    FROM conformed.customer_cash_risk
    ORDER BY overdue_ar DESC;
  `;
  const rows = await runQuery<{ dimension: string; overdue_ar: number }>(sql);
  const totalOverdue = rows.reduce((s, r) => s + Number(r.overdue_ar), 0);
  return {
    kpiName: "Overdue Accounts Receivable",
    unit: "inr-millions",
    actual: totalOverdue,
    plan: 0,
    rows: rows.map((r) => ({ dimension: r.dimension, actual: Number(r.overdue_ar), plan: 0, variance: -Number(r.overdue_ar) })),
    sql,
    sources: ["SAP S/4HANA FI", "MySQL (conformed)"],
  };
}

async function inventoryRisk(): Promise<ResolvedAnswer> {
  const sql = `
    SELECT product_name AS dimension, inventory_value, excess_value
    FROM conformed.inventory_exposure
    ORDER BY excess_value DESC;
  `;
  const rows = await runQuery<{ dimension: string; inventory_value: number; excess_value: number }>(sql);
  const totalExcess = rows.reduce((s, r) => s + Number(r.excess_value), 0);
  return {
    kpiName: "Excess Inventory Value",
    unit: "inr-millions",
    actual: totalExcess,
    plan: 0,
    rows: rows.map((r) => ({ dimension: r.dimension, actual: Number(r.inventory_value), plan: 0, variance: -Number(r.excess_value) })),
    sql,
    sources: ["SAP S/4HANA MM", "Anaplan Forecast", "MySQL (conformed)"],
  };
}

async function procurementVariance(): Promise<ResolvedAnswer> {
  const sql = `
    SELECT material_name AS dimension, standard_price, actual_price, ppv
    FROM conformed.purchase_price_variance
    ORDER BY ppv DESC;
  `;
  const rows = await runQuery<{ dimension: string; ppv: number }>(sql);
  const totalPpv = rows.reduce((s, r) => s + Number(r.ppv), 0);
  return {
    kpiName: "Purchase Price Variance",
    unit: "inr-millions",
    actual: totalPpv,
    plan: 0,
    rows: rows.map((r) => ({ dimension: r.dimension, actual: 0, plan: 0, variance: -Number(r.ppv) })),
    sql,
    sources: ["SAP S/4HANA MM", "MySQL (conformed)"],
  };
}

async function productionAttainment(): Promise<ResolvedAnswer> {
  const sql = `
    SELECT CONCAT(plant_name, ' — ', product_name) AS dimension, actual_units, planned_units, unit_variance
    FROM conformed.production_plan_attainment
    ORDER BY unit_variance ASC;
  `;
  const rows = await runQuery<{ dimension: string; actual_units: number; planned_units: number; unit_variance: number }>(sql);
  const actual = rows.reduce((s, r) => s + Number(r.actual_units), 0);
  const plan = rows.reduce((s, r) => s + Number(r.planned_units), 0);
  return {
    kpiName: "Production Units",
    unit: "count",
    actual,
    plan,
    rows: rows.map((r) => ({ dimension: r.dimension, actual: Number(r.actual_units), plan: Number(r.planned_units), variance: Number(r.unit_variance) })),
    sql,
    sources: ["SAP S/4HANA PP", "Anaplan Production Plan", "MySQL (conformed)"],
  };
}

async function workingCapital(): Promise<ResolvedAnswer> {
  const sql = `SELECT total_ar, total_ap, total_inventory, cash_conversion_exposure FROM conformed.working_capital_bridge;`;
  const [row] = await runQuery<{ total_ar: number; total_ap: number; total_inventory: number; cash_conversion_exposure: number }>(sql);
  return {
    kpiName: "Cash Conversion Exposure",
    unit: "inr-millions",
    actual: Number(row.cash_conversion_exposure),
    plan: 0,
    rows: [
      { dimension: "Accounts Receivable", actual: Number(row.total_ar), plan: 0, variance: Number(row.total_ar) },
      { dimension: "Inventory", actual: Number(row.total_inventory), plan: 0, variance: Number(row.total_inventory) },
      { dimension: "Accounts Payable (offsets)", actual: -Number(row.total_ap), plan: 0, variance: -Number(row.total_ap) },
    ],
    sql,
    sources: ["SAP S/4HANA FI", "MySQL (conformed)"],
  };
}

const RESOLVERS: Record<Intent, () => Promise<ResolvedAnswer>> = {
  variance_root_cause: ebitdaRootCause,
  ranked_driver: ebitdaRootCause,
  ar_risk: arRisk,
  inventory_risk: inventoryRisk,
  procurement_variance: procurementVariance,
  production_attainment: productionAttainment,
  working_capital: workingCapital,
  general_finance: ebitdaRootCause,
};

export function resolveIntent(intent: Intent): Promise<ResolvedAnswer> {
  return RESOLVERS[intent]();
}

// Real plant x product variance grid — backs the heatmap chart type.
// Only meaningful for production_attainment, since that's the only
// resolver with a genuine two-dimension breakdown; other intents fall
// back to bar-diverging in the engine rather than faking a grid.
export async function productionAttainmentMatrix(): Promise<{ row: string; col: string; value: number }[]> {
  const rows = await runQuery<{ plant_name: string; product_name: string; unit_variance: number }>(`
    SELECT plant_name, product_name, unit_variance
    FROM conformed.production_plan_attainment;
  `);
  return rows.map((r) => ({ row: r.plant_name, col: r.product_name, value: Number(r.unit_variance) }));
}
