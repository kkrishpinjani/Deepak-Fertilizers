// Looks up the real neighborhood of the top driver in the Neo4j
// ontology graph — actual relationships from the live graph, not a
// description of which MySQL tables were touched. Returns null if
// Neo4j isn't reachable (dormant fallback, same pattern as the rest
// of this app's optional connectors), in which case the engine falls
// back to text-only ontology evidence.

import { runCypher, neo4jHealthy } from "@/lib/neo4j";

export type GraphNeighborhood = {
  centerName: string;
  edges: { relType: string; direction: "out" | "in"; otherLabel: string; otherName: string }[];
};

export async function lookupGraphContext(dimensionName: string): Promise<GraphNeighborhood | null> {
  if (!(await neo4jHealthy())) return null;
  try {
    const rows = await runCypher<{ relType: string; direction: string; otherLabel: string; otherName: string }>(
      `MATCH (n {name: $name})-[r]-(m)
       RETURN type(r) AS relType,
              CASE WHEN startNode(r) = n THEN 'out' ELSE 'in' END AS direction,
              labels(m)[0] AS otherLabel, coalesce(m.name, m.id) AS otherName
       LIMIT 10`,
      { name: dimensionName }
    );
    if (!rows.length) return null;
    return { centerName: dimensionName, edges: rows as any };
  } catch {
    return null;
  }
}
