import { NextResponse } from "next/server";
import { seedOntologyGraph, graphStats } from "@/lib/copilot/neo4jSeed";
import { runCypher, neo4jHealthy } from "@/lib/neo4j";

export async function GET() {
  const healthy = await neo4jHealthy();
  if (!healthy) {
    return NextResponse.json({ healthy: false, error: "Neo4j is not reachable. Run: docker compose up -d" }, { status: 503 });
  }
  const stats = await graphStats();
  const sample = await runCypher(`
    MATCH (a)-[r]->(b)
    RETURN labels(a)[0] AS fromLabel, a.id AS fromId, coalesce(a.name, a.id) AS fromName,
           type(r) AS relType,
           labels(b)[0] AS toLabel, b.id AS toId, coalesce(b.name, b.id) AS toName
    LIMIT 150;
  `);
  return NextResponse.json({ healthy: true, stats, sample });
}

export async function POST() {
  const healthy = await neo4jHealthy();
  if (!healthy) {
    return NextResponse.json({ error: "Neo4j is not reachable. Run: docker compose up -d" }, { status: 503 });
  }
  const stats = await seedOntologyGraph();
  return NextResponse.json({ ok: true, stats });
}
