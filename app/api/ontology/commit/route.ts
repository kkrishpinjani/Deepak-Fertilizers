import { NextRequest, NextResponse } from "next/server";
import { profileCsv, parseCsvRows } from "@/lib/copilot/schemaProfiler";
import { commitIngestion } from "@/lib/copilot/ingest";
import { ProposedRelationship } from "@/lib/copilot/batchProfiler";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const files: { name: string; csv: string }[] | undefined = body?.files;
  const relationships: ProposedRelationship[] = body?.relationships || [];

  if (!files || !files.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  try {
    const results = [];
    for (const f of files) {
      const profile = profileCsv(f.csv);
      const rows = parseCsvRows(f.csv);
      const rels = relationships.filter((r) => r.fromTable === f.name);
      const committed = await commitIngestion(f.name, profile, rows, rels);
      results.push({ file: f.name, ...committed });
    }
    return NextResponse.json({ committed: results });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Commit failed" }, { status: 500 });
  }
}
