import { NextResponse } from "next/server";
import { getBriefItems } from "@/lib/cfoBrief";

// Real "needs attention" items — same rule-derived computation the CFO
// Copilot page renders server-side, exposed here for the header
// notification bell (a client component) to fetch.
export async function GET() {
  const items = await getBriefItems();
  return NextResponse.json({ items });
}
