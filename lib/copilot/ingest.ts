// Commits an approved CSV ingestion plan for real: creates a table in
// the `uploads` MySQL database with inferred column types, loads the
// rows, and records lineage/relationship mappings in
// conformed.ingested_tables / conformed.ontology_mappings. This
// replaces v17's commitPlan.ts, which wrote the same shape of
// information as Neo4j MERGE statements — there's no Neo4j here, so
// this writes it as real MySQL rows instead. Nothing is written until
// this function is called (i.e. until the human clicks Approve &
// Commit) — profiling and relationship proposal never touch the DB.

import { getPool } from "@/lib/db";
import { runCypher, neo4jHealthy } from "@/lib/neo4j";
import { CsvProfile } from "./schemaProfiler";
import { ProposedRelationship } from "./batchProfiler";

function sqlIdent(name: string) {
  const safe = name.trim().replace(/[^a-zA-Z0-9_]+/g, "_").replace(/^_+/, "").slice(0, 60);
  return safe || "col";
}

function columnDdl(type: CsvProfile["columns"][number]["inferredType"]) {
  switch (type) {
    case "date": return "DATE NULL";
    case "integer": return "BIGINT NULL";
    case "number": return "DECIMAL(18,4) NULL";
    default: return "VARCHAR(255) NULL";
  }
}

export async function commitIngestion(
  tableName: string,
  profile: CsvProfile,
  rows: Record<string, any>[],
  relationships: ProposedRelationship[]
) {
  const pool = getPool();
  const uploadTable = sqlIdent(tableName);
  const columnNames = profile.columns.map((c) => sqlIdent(c.name));

  await pool.query(`DROP TABLE IF EXISTS uploads.\`${uploadTable}\`;`);
  const ddl = profile.columns.map((c, i) => `\`${columnNames[i]}\` ${columnDdl(c.inferredType)}`).join(", ");
  await pool.query(`CREATE TABLE uploads.\`${uploadTable}\` (${ddl});`);

  if (rows.length) {
    const placeholders = `(${columnNames.map(() => "?").join(",")})`;
    const values = rows.map((r) => profile.columns.map((c) => cleanValue(r[c.name], c.inferredType)));
    const flatSql = `INSERT INTO uploads.\`${uploadTable}\` (${columnNames.map((c) => `\`${c}\``).join(",")}) VALUES ${rows
      .map(() => placeholders)
      .join(",")};`;
    await pool.query(flatSql, values.flat());
  }

  const id = `CSV::${uploadTable}::${Date.now()}`;
  await pool.query(
    `INSERT INTO conformed.ingested_tables (id, table_name, row_count, primary_key, entities, status)
     VALUES (?, ?, ?, ?, ?, 'ACTIVE');`,
    [id, uploadTable, rows.length, profile.primaryKey, profile.entities.join(", ")]
  );

  for (const rel of relationships.filter((r) => r.confidence >= 0.75)) {
    const mid = `${id}::${rel.fromColumn}::${rel.toEntity}`.slice(0, 80);
    await pool.query(
      `INSERT INTO conformed.ontology_mappings
         (id, source_table_id, from_entity, from_column, to_table, to_column, to_entity, relationship, confidence, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED')
       ON DUPLICATE KEY UPDATE confidence = VALUES(confidence);`,
      [mid, id, rel.fromEntity, rel.fromColumn, rel.toTable, rel.toColumn, rel.toEntity, rel.relationship, rel.confidence]
    );
  }

  const neo4j = await commitToNeo4j(uploadTable, profile, rows, relationships, id);

  return {
    id,
    table: `uploads.${uploadTable}`,
    rowsLoaded: rows.length,
    mappingsRecorded: relationships.filter((r) => r.confidence >= 0.75).length,
    neo4j,
  };
}

// Real Neo4j MERGE commit — this is what v17's original commitPlan.ts did
// (against a Neo4j the doc's package assumed existed). We now have a real
// container, so this actually runs: one node per discovered entity type,
// MERGEd from the uploaded rows' key column, plus a SourceTable node with
// an IMPLEMENTS edge to each entity — same shape as the source's Cypher,
// just executed against a real database instead of being unreachable.
async function commitToNeo4j(
  tableName: string,
  profile: CsvProfile,
  rows: Record<string, any>[],
  relationships: ProposedRelationship[],
  sourceId: string
): Promise<{ committed: boolean; reason?: string; entitiesLinked?: number }> {
  if (!(await neo4jHealthy())) {
    return { committed: false, reason: "Neo4j not reachable (docker compose up -d)" };
  }
  const key = profile.primaryKey || profile.columns[0]?.name;
  if (!key) return { committed: false, reason: "No usable key column" };

  await runCypher(
    `MERGE (s:SourceTable {id: $id}) SET s.name = $name, s.status = 'ACTIVE', s.rowCount = $count, s.primaryKey = $pk, s.ingestedAt = datetime()`,
    { id: sourceId, name: tableName, count: rows.length, pk: key }
  );

  let entitiesLinked = 0;
  for (const entity of profile.entities) {
    const label = entity.replace(/[^A-Za-z0-9_]/g, "_");
    const keyValues = rows.map((r) => String(r[key] ?? "")).filter(Boolean);
    if (!keyValues.length) continue;
    await runCypher(
      `UNWIND $ids AS rid
       MERGE (n:${label} {id: rid}) SET n.ingestSource = $source, n.ingestedAt = datetime()
       WITH n MATCH (s:SourceTable {id: $source}) MERGE (s)-[:IMPLEMENTS]->(n)`,
      { ids: keyValues, source: sourceId }
    );
    entitiesLinked++;
  }

  for (const rel of relationships.filter((r) => r.confidence >= 0.75 && r.fromTable === tableName)) {
    await runCypher(
      `MERGE (m:OntologyMapping {id: $id})
       SET m.fromEntity = $from, m.fromColumn = $fromColumn, m.toEntity = $to, m.toColumn = $toColumn,
           m.relationship = $rel, m.confidence = $confidence, m.status = 'APPROVED'
       WITH m MATCH (s:SourceTable {id: $source}) MERGE (s)-[:HAS_MAPPING]->(m)`,
      {
        id: `${sourceId}::${rel.fromColumn}::${rel.toEntity}`.slice(0, 100),
        from: rel.fromEntity,
        fromColumn: rel.fromColumn,
        to: rel.toEntity,
        toColumn: rel.toColumn || "",
        rel: rel.relationship,
        confidence: rel.confidence,
        source: sourceId,
      }
    );
  }

  return { committed: true, entitiesLinked };
}

function cleanValue(v: any, type: CsvProfile["columns"][number]["inferredType"]) {
  if (v === undefined || v === null || v === "") return null;
  if (type === "integer" || type === "number") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (type === "date") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  return String(v).slice(0, 255);
}
