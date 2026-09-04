import { NextResponse } from "next/server";
import { runQuery } from "@/lib/db";

export async function GET() {
  const tables = await runQuery(`
    SELECT source_system, code, description, domain, implemented, implemented_as
    FROM conformed.source_table_catalog
    ORDER BY source_system, implemented DESC, code;
  `);
  const entities = await runQuery(`
    SELECT entity, description, source, implemented, implemented_as
    FROM conformed.ontology_entity_catalog
    ORDER BY implemented DESC, entity;
  `);
  const relationships = await runQuery(`
    SELECT from_entity, relationship, to_entity, implemented
    FROM conformed.ontology_relationship_catalog
    ORDER BY implemented DESC, from_entity;
  `);
  return NextResponse.json({ tables, entities, relationships });
}
