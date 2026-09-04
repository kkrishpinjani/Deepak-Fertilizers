// Safety/sanity guards run against the SQL and result the copilot
// actually used. Ported from v17's backend/validation/*.ts. These run
// for real, against the real SQL text and real MySQL result rows —
// not a simulation.

const FORBIDDEN = /\b(DROP|TRUNCATE|DELETE|ALTER|CREATE|GRANT|REVOKE|INSERT|UPDATE|MERGE|CALL)\b/i;
const COMMENT = /--|\/\*|\*\//;

export function validateSql(sql: string) {
  const s = sql.trim().replace(/;+\s*$/, "");
  const errors: string[] = [];
  if (!s) errors.push("Empty SQL");
  if (FORBIDDEN.test(s)) errors.push("Only read-only SELECT queries are permitted.");
  if (COMMENT.test(s)) errors.push("SQL comments are rejected by the safety gate.");
  if (!/^\s*(WITH\b[\s\S]+SELECT\b|SELECT\b)/i.test(s)) errors.push("Query must begin with SELECT or WITH.");
  if (s.includes(";")) errors.push("Multiple statements are rejected.");
  return { valid: errors.length === 0, errors, normalized: s };
}

// Known conformed-model tables/views the copilot is allowed to reference.
// Anything else in the generated SQL fails this gate — the ontology
// boundary is "the copilot may only touch the conformed model", not
// raw SAP/Anaplan staging tables.
export const APPROVED_TABLES = new Set([
  "sales_performance", "finance_performance", "pl_summary", "executive_outlook",
  "headcount_summary", "working_capital_summary", "business_glossary",
  "inventory_exposure", "slow_moving_inventory", "purchase_price_variance",
  "production_cost_variance", "production_plan_attainment",
  "order_to_cash_leakage", "order_to_cash_summary", "revenue_recognition",
  "customer_cash_risk", "ap_procurement_cash", "working_capital_bridge",
  "capex_economics", "scenario_ebitda", "cfo_root_cause",
]);

export function validateAgainstOntology(sql: string) {
  const referenced = [...sql.matchAll(/\b(?:FROM|JOIN)\s+([A-Za-z0-9_."-]+)/gi)].map((m) =>
    m[1].replace(/["']/g, "").toLowerCase().replace(/^conformed\./, "")
  );
  const unknown = referenced.filter((t) => !APPROVED_TABLES.has(t));
  return {
    valid: unknown.length === 0,
    referencedTables: referenced,
    unknownTables: [...new Set(unknown)],
    warning: unknown.length ? `SQL references tables outside the approved conformed model: ${[...new Set(unknown)].join(", ")}` : "",
  };
}

export function validateResult(rows: any[], sql: string) {
  const issues: string[] = [];
  if (!Array.isArray(rows)) issues.push("Result is not tabular.");
  if (rows.length > 10000) issues.push("Result exceeds 10,000 rows; require aggregation or pagination.");
  const cols = rows[0] ? Object.keys(rows[0]) : [];
  const numeric = cols.filter((c) => rows.some((r) => typeof r[c] === "number" && Number.isFinite(r[c])));
  const hasNaN = rows.some((r) => cols.some((c) => typeof r[c] === "number" && !Number.isFinite(r[c])));
  if (hasNaN) issues.push("Non-finite numeric result detected.");
  if (numeric.length === 0 && rows.length > 0 && /\bSUM|AVG|COUNT|MIN|MAX\b/i.test(sql))
    issues.push("Expected an aggregate numeric result but none was returned.");
  return { valid: issues.length === 0, issues, rowCount: rows.length, columns: cols };
}
