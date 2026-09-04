// Ported from v17's backend/ontology/schemaProfiler.ts, with one real
// bug fixed: the source's numberRe/dateRe were regex *literals*
// containing double-escaped backslashes (`/^-?\\d+.../`), which in a
// regex literal means "match a literal backslash then the letter d" —
// they never matched an actual digit. Fixed below to `\d`.

import { parse } from "csv-parse/sync";

const norm = (x: string) => x.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
const numberRe = /^-?\d+(\.\d+)?$/;
const dateRe = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/;

const ENTITY_HINTS: Record<string, string[]> = {
  Customer: ["customer", "customer_id", "kunnr"],
  Vendor: ["vendor", "supplier", "vendor_id", "lifnr"],
  Material: ["material", "material_id", "matnr", "product", "sku"],
  Plant: ["plant", "werks", "site"],
  Company: ["company", "company_code", "bukrs", "legal_entity"],
  CostCenter: ["cost_center", "kostl"],
  ProfitCenter: ["profit_center", "prctr"],
  GLAccount: ["gl_account", "saknr", "account"],
  FiscalPeriod: ["period", "fiscal_period", "month", "year"],
  Revenue: ["revenue", "sales", "net_sales"],
  COGS: ["cogs", "cost_of_goods"],
  Inventory: ["inventory", "stock"],
  Quantity: ["quantity", "qty", "units"],
  Price: ["price", "unit_price"],
  Margin: ["margin", "gross_margin"],
  Variance: ["variance", "difference", "delta"],
};

export type ProfiledColumn = {
  name: string;
  normalized: string;
  inferredType: "date" | "integer" | "number" | "string";
  nullRate: number;
  uniqueRate: number;
  samples: string[];
  keyScore: number;
  entityHints: string[];
};

export type CsvProfile = {
  rows: number;
  columns: ProfiledColumn[];
  primaryKey: string | null;
  entities: string[];
  metrics: string[];
  sampleRows: Record<string, any>[];
};

export function profileCsv(csv: string): CsvProfile {
  const rows: any[] = parse(csv, { columns: true, skip_empty_lines: true, relax_column_count: true });
  const headers = rows.length ? Object.keys(rows[0]) : [];

  const columns: ProfiledColumn[] = headers.map((name) => {
    const vals = rows.map((r) => String(r[name] ?? "").trim());
    const non = vals.filter(Boolean);
    const n = norm(name);
    const numeric = non.filter((v) => numberRe.test(v)).length;
    const dates = non.filter((v) => dateRe.test(v)).length;
    const inferredType: ProfiledColumn["inferredType"] =
      dates / Math.max(non.length, 1) > 0.8
        ? "date"
        : numeric / Math.max(non.length, 1) > 0.95
        ? non.every((v) => Number.isInteger(Number(v)))
          ? "integer"
          : "number"
        : "string";
    const unique = new Set(non).size;
    const entityHints = Object.entries(ENTITY_HINTS)
      .filter(([, aliases]) => aliases.some((a) => n === a || n.includes(a)))
      .map(([entity]) => entity);
    const keyScore = Math.min(
      1,
      (/(^id$|_id$|code$|_key$|number$|no$)/i.test(name) ? 0.55 : 0) + (non.length ? unique / non.length : 0) * 0.45
    );
    return {
      name,
      normalized: n,
      inferredType,
      nullRate: 1 - non.length / Math.max(vals.length, 1),
      uniqueRate: non.length ? unique / non.length : 0,
      samples: non.slice(0, 5),
      keyScore,
      entityHints,
    };
  });

  const primaryKey = [...columns].sort((a, b) => b.keyScore - a.keyScore)[0]?.name || null;

  const scores: Record<string, number> = {};
  for (const c of columns) for (const e of c.entityHints) scores[e] = (scores[e] || 0) + c.keyScore + 0.2;
  const entities = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map((x) => x[0])
    .slice(0, 5);

  const metrics = columns.filter((c) => ["number", "integer"].includes(c.inferredType) && !c.entityHints.length).map((c) => c.name);

  return { rows: rows.length, columns, primaryKey, entities, metrics, sampleRows: rows.slice(0, 5) };
}

export function parseCsvRows(csv: string): Record<string, any>[] {
  return parse(csv, { columns: true, skip_empty_lines: true, relax_column_count: true });
}
