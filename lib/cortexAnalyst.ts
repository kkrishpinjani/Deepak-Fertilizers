// Dormant Cortex Analyst REST client, carried over from the doc's "V2
// live Snowflake" demo package. Inactive by default. Set SNOWFLAKE_HOST,
// SNOWFLAKE_PAT and CORTEX_SEMANTIC_VIEW to activate — /api/ask only
// calls this when cortexConfigured() is true; otherwise it falls back
// to the keyword matcher in lib/nlMatch.ts against MySQL.

export type AnalystResult = {
  requestId?: string;
  text?: string;
  sql?: string;
  warnings?: { message: string }[];
  semanticView: string;
};

function host() {
  const h = process.env.SNOWFLAKE_HOST;
  if (!h) throw new Error("SNOWFLAKE_HOST is not configured. Example: https://org-account.snowflakecomputing.com");
  return h.replace(/\/$/, "");
}

export function cortexConfigured() {
  return Boolean(process.env.SNOWFLAKE_PAT && process.env.SNOWFLAKE_HOST && process.env.CORTEX_SEMANTIC_VIEW);
}

export async function askCortexAnalyst(question: string): Promise<AnalystResult> {
  if (!cortexConfigured()) throw new Error("Cortex Analyst is not configured. Set SNOWFLAKE_HOST, SNOWFLAKE_PAT and CORTEX_SEMANTIC_VIEW.");

  const response = await fetch(`${host()}/api/v2/cortex/analyst/message`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SNOWFLAKE_PAT}`,
      "Content-Type": "application/json",
      "X-Snowflake-Authorization-Token-Type": "PROGRAMMATIC_ACCESS_TOKEN",
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: [{ type: "text", text: question }] }],
      semantic_view: process.env.CORTEX_SEMANTIC_VIEW,
      stream: false,
    }),
  });

  const body = await response.json();
  if (!response.ok) throw new Error(body?.message || body?.error || `Cortex Analyst HTTP ${response.status}`);

  const content = body?.message?.content || [];
  const textBlock = content.find((x: any) => x.type === "text");
  const sqlBlock = content.find((x: any) => x.type === "sql");

  return {
    requestId: body.request_id,
    text: textBlock?.text,
    sql: sqlBlock?.statement,
    warnings: body.warnings || [],
    semanticView: process.env.CORTEX_SEMANTIC_VIEW!,
  };
}
