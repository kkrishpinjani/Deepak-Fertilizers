import { NextRequest, NextResponse } from "next/server";
import { runQuery, runParamQuery } from "@/lib/db";

export async function GET() {
  const rows = await runQuery(`
    SELECT id, question, action_type, target, reason, status, created_at, decided_at
    FROM conformed.copilot_action_proposals
    ORDER BY created_at DESC
    LIMIT 50;
  `);
  return NextResponse.json({ rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id: string | undefined = body?.id;
  const decision: string | undefined = body?.decision; // "APPROVED" | "REJECTED"

  if (!id || !decision || !["APPROVED", "REJECTED"].includes(decision)) {
    return NextResponse.json({ error: "Missing or invalid id/decision" }, { status: 400 });
  }

  await runParamQuery(
    `UPDATE conformed.copilot_action_proposals SET status = ?, decided_at = NOW() WHERE id = ?;`,
    [decision, id]
  );

  return NextResponse.json({ ok: true, id, status: decision });
}
