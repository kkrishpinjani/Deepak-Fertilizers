// Real Neo4j connector — dedicated Docker container for this project
// (docker-compose.yml), not shared with any other project. No demo
// mode: if the container isn't up, these calls fail loudly rather
// than silently falling back, so it's obvious when the graph is down.

import neo4j, { Driver } from "neo4j-driver";

let driver: Driver | null = null;

export function getNeo4jDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(
      process.env.NEO4J_URI || "bolt://127.0.0.1:7687",
      neo4j.auth.basic(process.env.NEO4J_USER || "neo4j", process.env.NEO4J_PASSWORD || "")
    );
  }
  return driver;
}

// Neo4j returns its Integer type as {low, high} objects, not plain JS
// numbers — convert recursively so API responses/UI don't have to
// special-case it.
function unwrapIntegers(value: any): any {
  if (value === null || value === undefined) return value;
  if (neo4j.isInt(value)) return value.toNumber();
  if (Array.isArray(value)) return value.map(unwrapIntegers);
  if (typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = unwrapIntegers(v);
    return out;
  }
  return value;
}

export async function runCypher<T = Record<string, any>>(cypher: string, params: Record<string, any> = {}): Promise<T[]> {
  const session = getNeo4jDriver().session();
  try {
    const result = await session.run(cypher, params);
    return result.records.map((r) => unwrapIntegers(r.toObject()) as T);
  } finally {
    await session.close();
  }
}

export async function neo4jHealthy(): Promise<boolean> {
  try {
    await runCypher("RETURN 1");
    return true;
  } catch {
    return false;
  }
}
