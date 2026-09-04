import { NextResponse } from "next/server";
import { neo4jHealthy } from "@/lib/neo4j";
import { ollamaHealthy } from "@/lib/ollama";
import { snowflakeConfigured, snowflakeHealthy } from "@/lib/snowflake";
import { sapODataConfigured, sapODataHealthy } from "@/lib/sapOData";
import { anaplanConfigured, anaplanHealthy } from "@/lib/anaplanApi";

// Live status for every connector this project has code for — the
// two active ones (Neo4j, Ollama) this project actually runs against,
// and the three dormant ones (Snowflake, SAP OData, Anaplan API) that
// are real client code with no live account to activate against. Each
// row's `healthy` is a genuine network call, not a hardcoded flag.
export async function GET() {
  const [neo4j, ollama, snowflake, sap, anaplan] = await Promise.all([
    neo4jHealthy(),
    ollamaHealthy(),
    snowflakeHealthy(),
    sapODataHealthy(),
    anaplanHealthy(),
  ]);

  return NextResponse.json({
    connectors: [
      { name: "Neo4j", mode: "active", configured: true, healthy: neo4j, detail: "Dedicated Docker container for this project's ontology graph." },
      { name: "Ollama (local LLM)", mode: "active", configured: true, healthy: ollama, detail: "Local Qwen model for intent classification and rationale generation." },
      { name: "Snowflake", mode: "dormant", configured: snowflakeConfigured(), healthy: snowflake, detail: "Real SQL execution + INFORMATION_SCHEMA discovery. No live account configured." },
      { name: "SAP OData", mode: "dormant", configured: sapODataConfigured(), healthy: sap, detail: "Real $metadata XML discovery. No live S/4HANA system configured." },
      { name: "Anaplan API", mode: "dormant", configured: anaplanConfigured(), healthy: anaplan, detail: "Real model/module discovery via api.anaplan.com. No live tenant configured." },
    ],
  });
}
