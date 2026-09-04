import { NextRequest, NextResponse } from "next/server";
import { runCypher, neo4jHealthy } from "@/lib/neo4j";

// Real 1-hop neighborhood for a single node — backs the Ontology
// Explorer's click-to-expand/re-center interaction (V5). Every click
// runs a fresh Cypher MATCH against the live container; nothing here
// is precomputed or cached client-side.
export async function GET(req: NextRequest) {
  const label = req.nextUrl.searchParams.get("label");
  const id = req.nextUrl.searchParams.get("id");
  if (!label || !id) return NextResponse.json({ error: "Missing label or id" }, { status: 400 });

  const healthy = await neo4jHealthy();
  if (!healthy) return NextResponse.json({ error: "Neo4j is not reachable. Run: docker compose up -d" }, { status: 503 });

  const rows = await runCypher(
    `
    MATCH (center {id: $id})
    WHERE labels(center)[0] = $label
    OPTIONAL MATCH (center)-[r]-(other)
    RETURN labels(center)[0] AS centerLabel, center.id AS centerId, coalesce(center.name, center.id) AS centerName,
           labels(other)[0] AS otherLabel, other.id AS otherId, coalesce(other.name, other.id) AS otherName,
           type(r) AS relType, startNode(r).id = center.id AS outgoing
    LIMIT 60;
    `,
    { label, id }
  );

  if (!rows.length) return NextResponse.json({ error: "Node not found" }, { status: 404 });

  const center = { label: rows[0].centerLabel, id: rows[0].centerId, name: rows[0].centerName };
  const neighbors = rows
    .filter((r: any) => r.otherId != null)
    .map((r: any) => ({ label: r.otherLabel, id: r.otherId, name: r.otherName, relType: r.relType, outgoing: r.outgoing }));

  return NextResponse.json({ center, neighbors });
}
