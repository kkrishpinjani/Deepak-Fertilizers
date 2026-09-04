import { NextResponse } from "next/server";
import { seedCatalogGraph } from "@/lib/copilot/neo4jSeed";
import { neo4jHealthy } from "@/lib/neo4j";

export async function POST() {
  const healthy = await neo4jHealthy();
  if (!healthy) {
    return NextResponse.json({ error: "Neo4j is not reachable. Run: docker compose up -d" }, { status: 503 });
  }
  const stats = await seedCatalogGraph();
  return NextResponse.json({ ok: true, stats });
}
