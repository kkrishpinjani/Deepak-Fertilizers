// Real dimension-aware drill-down: given the name of a driver the
// copilot already surfaced (a GL account, plant, product, customer,
// cost center or vendor), classify what kind of entity it is by
// checking it against the real dimension tables, then run a genuinely
// different, more granular query scoped to it — not just re-running
// the same top-level ranking with a re-worded question.

import { runParamQuery } from "@/lib/db";
import { DriverRow, ResolvedAnswer } from "./resolvers";

type DimensionType = "gl_account" | "cost_center" | "plant" | "product" | "customer" | "vendor" | "unknown";

async function classifyDimension(name: string): Promise<DimensionType> {
  const checks: [DimensionType, string, string][] = [
    ["gl_account", "conformed.dim_gl_account", "gl_account_name"],
    ["cost_center", "conformed.dim_cost_center", "cost_center_name"],
    ["plant", "conformed.dim_plant", "plant_name"],
    ["product", "conformed.dim_product", "product_name"],
    ["customer", "conformed.dim_customer", "customer_name"],
    ["vendor", "conformed.dim_vendor", "vendor_name"],
  ];
  for (const [type, table, col] of checks) {
    const rows = await runParamQuery(`SELECT 1 FROM ${table} WHERE ${col} = ? LIMIT 1;`, [name]);
    if (rows.length) return type;
  }
  return "unknown";
}

export async function resolveDrill(dimensionName: string): Promise<ResolvedAnswer & { drillType: DimensionType }> {
  const type = await classifyDimension(dimensionName);

  if (type === "gl_account") {
    const sql = `
      SELECT cost_center_name AS dimension, SUM(actual_amount) AS actual, SUM(budget_amount) AS plan, SUM(financial_variance) AS variance
      FROM conformed.finance_performance WHERE gl_account_name = ? GROUP BY cost_center_name ORDER BY variance;`;
    const rows = await runParamQuery<DriverRow>(sql, [dimensionName]);
    const actual = rows.reduce((s, r) => s + Number(r.actual), 0);
    const plan = rows.reduce((s, r) => s + Number(r.plan), 0);
    return { kpiName: `${dimensionName} — by cost center`, unit: "inr-millions", actual, plan, rows, sql: sql.replace("?", `'${dimensionName}'`), sources: ["SAP S/4HANA FI", "MySQL (conformed)"], drillType: type };
  }

  if (type === "cost_center") {
    const sql = `
      SELECT gl_account_name AS dimension, SUM(actual_amount) AS actual, SUM(budget_amount) AS plan, SUM(financial_variance) AS variance
      FROM conformed.finance_performance WHERE cost_center_name = ? GROUP BY gl_account_name ORDER BY variance;`;
    const rows = await runParamQuery<DriverRow>(sql, [dimensionName]);
    const actual = rows.reduce((s, r) => s + Number(r.actual), 0);
    const plan = rows.reduce((s, r) => s + Number(r.plan), 0);
    return { kpiName: `${dimensionName} — by GL account`, unit: "inr-millions", actual, plan, rows, sql: sql.replace("?", `'${dimensionName}'`), sources: ["SAP S/4HANA FI", "MySQL (conformed)"], drillType: type };
  }

  if (type === "plant") {
    const sql = `
      SELECT product_name AS dimension, SUM(actual_revenue) AS actual, SUM(budget_revenue) AS plan, SUM(revenue_variance) AS variance
      FROM conformed.sales_performance WHERE plant_name = ? GROUP BY product_name ORDER BY variance;`;
    const rows = await runParamQuery<DriverRow>(sql, [dimensionName]);
    const actual = rows.reduce((s, r) => s + Number(r.actual), 0);
    const plan = rows.reduce((s, r) => s + Number(r.plan), 0);
    return { kpiName: `${dimensionName} — revenue by product`, unit: "inr-millions", actual, plan, rows, sql: sql.replace("?", `'${dimensionName}'`), sources: ["SAP S/4HANA Sales", "MySQL (conformed)"], drillType: type };
  }

  if (type === "product") {
    const sql = `
      SELECT customer_name AS dimension, SUM(actual_revenue) AS actual, SUM(budget_revenue) AS plan, SUM(revenue_variance) AS variance
      FROM conformed.sales_performance WHERE product_name = ? GROUP BY customer_name ORDER BY variance;`;
    const rows = await runParamQuery<DriverRow>(sql, [dimensionName]);
    const actual = rows.reduce((s, r) => s + Number(r.actual), 0);
    const plan = rows.reduce((s, r) => s + Number(r.plan), 0);
    return { kpiName: `${dimensionName} — revenue by customer`, unit: "inr-millions", actual, plan, rows, sql: sql.replace("?", `'${dimensionName}'`), sources: ["SAP S/4HANA Sales", "MySQL (conformed)"], drillType: type };
  }

  if (type === "customer") {
    const sql = `
      SELECT product_name AS dimension, SUM(actual_revenue) AS actual, SUM(budget_revenue) AS plan, SUM(revenue_variance) AS variance
      FROM conformed.sales_performance WHERE customer_name = ? GROUP BY product_name ORDER BY variance;`;
    const rows = await runParamQuery<DriverRow>(sql, [dimensionName]);
    const actual = rows.reduce((s, r) => s + Number(r.actual), 0);
    const plan = rows.reduce((s, r) => s + Number(r.plan), 0);
    return { kpiName: `${dimensionName} — revenue by product`, unit: "inr-millions", actual, plan, rows, sql: sql.replace("?", `'${dimensionName}'`), sources: ["SAP S/4HANA Sales", "MySQL (conformed)"], drillType: type };
  }

  if (type === "vendor") {
    const sql = `
      SELECT material_name AS dimension, 0 AS actual, 0 AS plan, SUM(ppv) AS variance
      FROM conformed.purchase_price_variance WHERE vendor_name = ? GROUP BY material_name ORDER BY variance DESC;`;
    const rows = await runParamQuery<DriverRow>(sql, [dimensionName]);
    return { kpiName: `${dimensionName} — purchase price variance by material`, unit: "inr-millions", actual: 0, plan: 0, rows, sql: sql.replace("?", `'${dimensionName}'`), sources: ["SAP S/4HANA MM", "MySQL (conformed)"], drillType: type };
  }

  // Unknown dimension — fall back to the top-level ranking rather than erroring.
  const sql = `SELECT driver AS dimension, 0 AS actual, 0 AS plan, ebitda_impact AS variance FROM conformed.cfo_root_cause LIMIT 10;`;
  const rows = await runParamQuery<DriverRow>(sql, []);
  return { kpiName: "EBITDA drivers (could not scope further)", unit: "inr-millions", actual: 0, plan: 0, rows, sql, sources: ["MySQL (conformed)"], drillType: type };
}
