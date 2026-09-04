import { NextRequest, NextResponse } from "next/server";
import { profileBatch } from "@/lib/copilot/batchProfiler";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const files: { name: string; csv: string }[] | undefined = body?.files;

  if (!files || !files.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  try {
    const batch = profileBatch(files);
    return NextResponse.json(batch);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Profiling failed" }, { status: 500 });
  }
}
