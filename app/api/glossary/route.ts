import { NextResponse } from "next/server";
import { runQuery } from "@/lib/db";

export async function GET() {
  const rows = await runQuery(`
    SELECT term, definition, business_rule, source_system, metric_name
    FROM conformed.business_glossary
    ORDER BY priority, term;
  `);
  return NextResponse.json({ rows });
}
