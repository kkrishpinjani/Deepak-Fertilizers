import { NextRequest, NextResponse } from "next/server";
import { runInvestigation } from "@/lib/copilot/engine";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const question: string | undefined = body?.question;
  const dimension: string | undefined = body?.dimension;
  const threadId: string | undefined = body?.threadId;

  if (!question || !question.trim()) {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }

  try {
    const result = await runInvestigation(question.trim(), dimension, threadId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Investigation failed" }, { status: 500 });
  }
}
