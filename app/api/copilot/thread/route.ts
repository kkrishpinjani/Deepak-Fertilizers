import { NextRequest, NextResponse } from "next/server";
import { createThread, getThreadMessages } from "@/lib/copilot/threads";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const title: string | undefined = body?.title;
  try {
    const id = await createThread(title);
    return NextResponse.json({ id });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to create thread" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    const messages = await getThreadMessages(id);
    return NextResponse.json({ id, messages });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to load thread" }, { status: 500 });
  }
}
