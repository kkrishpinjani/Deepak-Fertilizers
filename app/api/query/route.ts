import { NextRequest, NextResponse } from "next/server";
import { runActiveQuery, activeDataMode } from "@/lib/dataMode";
import { findQuery } from "@/lib/queries";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing query id" }, { status: 400 });
  }

  const query = findQuery(id);
  if (!query) {
    return NextResponse.json({ error: `Unknown query id: ${id}` }, { status: 404 });
  }

  const started = Date.now();
  try {
    const rows = await runActiveQuery(query.sql);
    return NextResponse.json({
      id: query.id,
      question: query.question,
      sources: query.sources,
      sql: query.sql.trim(),
      rows,
      dataMode: activeDataMode(),
      executionMs: Date.now() - started,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Query failed" },
      { status: 500 }
    );
  }
}
