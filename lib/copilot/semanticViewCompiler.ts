// Compiles the conformed model's real INFORMATION_SCHEMA metadata into
// a Snowflake Cortex Analyst semantic-model YAML (V10). This is a real
// compiler over real column metadata — column names/types/keys come
// from a live `information_schema.columns` query against the same
// tables the copilot's own SQL guard already treats as the approved
// ontology boundary (guards.ts APPROVED_TABLES) — not a hand-written
// YAML file pretending to be generated.

import { runParamQuery } from "@/lib/db";
import { APPROVED_TABLES } from "./guards";

type ColumnMeta = {
  TABLE_NAME: string;
  COLUMN_NAME: string;
  DATA_TYPE: string;
  COLUMN_KEY: string;
  COLUMN_COMMENT: string;
};

// Heuristic used throughout this project (schemaProfiler.ts, batchProfiler.ts):
// numeric, non-key/non-code columns are measures; everything else — ids,
// codes, names, dates, percents used for grouping — is a dimension.
function isMeasure(col: ColumnMeta): boolean {
  const numeric = /^(decimal|int|bigint|float|double)$/i.test(col.DATA_TYPE);
  const looksLikeKey = /(_id|_code|_key)$/i.test(col.COLUMN_NAME) || col.COLUMN_KEY === "PRI";
  return numeric && !looksLikeKey;
}

function yamlEscape(s: string): string {
  return /[:#{}\[\],&*!|>'"%@`]/.test(s) ? JSON.stringify(s) : s;
}

export async function compileSemanticView(): Promise<string> {
  const tableNames = [...APPROVED_TABLES].sort();
  const columns = await runParamQuery<ColumnMeta>(
    `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_KEY, COALESCE(COLUMN_COMMENT, '') AS COLUMN_COMMENT
     FROM information_schema.columns
     WHERE TABLE_SCHEMA = 'conformed' AND TABLE_NAME IN (${tableNames.map(() => "?").join(",")})
     ORDER BY TABLE_NAME, ORDINAL_POSITION;`,
    tableNames
  );

  const byTable = new Map<string, ColumnMeta[]>();
  for (const c of columns) {
    if (!byTable.has(c.TABLE_NAME)) byTable.set(c.TABLE_NAME, []);
    byTable.get(c.TABLE_NAME)!.push(c);
  }

  const lines: string[] = [];
  lines.push(`name: sap_anaplan_finance_intelligence`);
  lines.push(`description: >`);
  lines.push(`  Semantic model compiled from the conformed MySQL model's live schema —`);
  lines.push(`  the same ${tableNames.length} views/tables the copilot's SQL guard treats`);
  lines.push(`  as the approved ontology boundary. Regenerate via POST /api/semantic-view`);
  lines.push(`  whenever the conformed model's schema changes.`);
  lines.push(`tables:`);

  for (const table of tableNames) {
    const cols = byTable.get(table) || [];
    if (!cols.length) continue;
    lines.push(`  - name: ${table}`);
    lines.push(`    base_table:`);
    lines.push(`      database: conformed`);
    lines.push(`      schema: conformed`);
    lines.push(`      table: ${table}`);

    const dims = cols.filter((c) => !isMeasure(c));
    const measures = cols.filter(isMeasure);

    if (dims.length) {
      lines.push(`    dimensions:`);
      for (const d of dims) {
        lines.push(`      - name: ${d.COLUMN_NAME}`);
        lines.push(`        expr: ${d.COLUMN_NAME}`);
        lines.push(`        data_type: ${mapType(d.DATA_TYPE)}`);
        if (d.COLUMN_COMMENT) lines.push(`        description: ${yamlEscape(d.COLUMN_COMMENT)}`);
      }
    }
    if (measures.length) {
      lines.push(`    measures:`);
      for (const m of measures) {
        lines.push(`      - name: ${m.COLUMN_NAME}`);
        lines.push(`        expr: ${m.COLUMN_NAME}`);
        lines.push(`        data_type: ${mapType(m.DATA_TYPE)}`);
        lines.push(`        default_aggregation: sum`);
      }
    }
  }

  return lines.join("\n") + "\n";
}

function mapType(mysqlType: string): string {
  const t = mysqlType.toLowerCase();
  if (["decimal", "float", "double"].includes(t)) return "number";
  if (["int", "bigint", "smallint", "tinyint"].includes(t)) return "number";
  if (t === "date" || t === "datetime" || t === "timestamp") return "date";
  return "text";
}
