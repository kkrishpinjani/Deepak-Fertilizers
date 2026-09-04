import { NextResponse } from "next/server";
import { compileSemanticView } from "@/lib/copilot/semanticViewCompiler";

export async function GET() {
  try {
    const yaml = await compileSemanticView();
    return new NextResponse(yaml, { headers: { "Content-Type": "text/yaml; charset=utf-8" } });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Compile failed" }, { status: 500 });
  }
}
