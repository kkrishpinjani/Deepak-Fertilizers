import { NextRequest, NextResponse } from "next/server";
import { runInvestigation } from "@/lib/copilot/engine";
import { lookupGraphContext } from "@/lib/copilot/graphContext";
import { searchDocuments } from "@/lib/copilot/documentSearch";

// A real, minimal MCP (Model Context Protocol) server over the
// Streamable HTTP transport's non-streaming form: one JSON-RPC 2.0
// request in, one JSON-RPC 2.0 response out, implementing the actual
// MCP method names (initialize, tools/list, tools/call) and the real
// {content: [{type, text}]} tool-result shape any MCP client expects —
// not a mock. Every tool call runs the same real engine/Neo4j/MySQL
// code paths used by the copilot UI itself.

const TOOLS = [
  {
    name: "query_finance_data",
    description:
      "Run a CFO-style investigation question against the live SAP/Anaplan conformed finance model. Returns the KPI, top drivers, confidence, and a recommendation.",
    inputSchema: {
      type: "object",
      properties: { question: { type: "string", description: "A finance/supply-chain investigation question." } },
      required: ["question"],
    },
  },
  {
    name: "query_neo4j_ontology",
    description: "Look up a business entity's live neighborhood (relationships) in the Neo4j ontology graph.",
    inputSchema: {
      type: "object",
      properties: { entityName: { type: "string", description: "Name of a plant, customer, vendor, product, cost center, etc." } },
      required: ["entityName"],
    },
  },
  {
    name: "search_documents",
    description: "Full-text search over contracts, policies, and commentary documents.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
];

async function callTool(name: string, args: any) {
  if (name === "query_finance_data") {
    const result = await runInvestigation(String(args?.question || ""));
    return {
      kpi: result.kpi,
      topDrivers: result.rows.slice(0, 5),
      confidence: result.confidence,
      recommendation: result.recommendation,
    };
  }
  if (name === "query_neo4j_ontology") {
    const context = await lookupGraphContext(String(args?.entityName || ""));
    return context || { error: "No matching node found, or Neo4j is unreachable." };
  }
  if (name === "search_documents") {
    return await searchDocuments(String(args?.query || ""));
  }
  throw new Error(`Unknown tool: ${name}`);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 });
  }

  const { id, method, params } = body;

  try {
    if (method === "initialize") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          serverInfo: { name: "sap-anaplan-finance-intelligence", version: "1.0.0" },
          capabilities: { tools: {} },
        },
      });
    }

    if (method === "notifications/initialized") {
      // Notifications get no response body per the JSON-RPC spec.
      return new NextResponse(null, { status: 204 });
    }

    if (method === "tools/list") {
      return NextResponse.json({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
    }

    if (method === "tools/call") {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const data = await callTool(toolName, toolArgs);
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] },
      });
    }

    return NextResponse.json({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json(
      { jsonrpc: "2.0", id, error: { code: -32000, message: err?.message || "Tool execution failed" } },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: "sap-anaplan-finance-intelligence",
    protocol: "MCP over JSON-RPC 2.0 (Streamable HTTP, non-streaming)",
    tools: TOOLS.map((t) => t.name),
    usage: "POST a JSON-RPC 2.0 request with method: initialize | tools/list | tools/call",
  });
}
