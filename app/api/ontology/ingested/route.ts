import { NextResponse } from "next/server";
import { runQuery } from "@/lib/db";

export async function GET() {
  const tables = await runQuery(`
    SELECT id, table_name, row_count, primary_key, entities, status, ingested_at
    FROM conformed.ingested_tables
    ORDER BY ingested_at DESC;
  `);
  const mappings = await runQuery(`
    SELECT source_table_id, from_entity, from_column, to_table, to_column, to_entity, relationship, confidence
    FROM conformed.ontology_mappings
    ORDER BY confidence DESC;
  `);
  return NextResponse.json({ tables, mappings });
}
