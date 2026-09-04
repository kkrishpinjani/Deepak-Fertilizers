// Dormant SAP S/4HANA OData metadata connector. Inactive unless
// SAP_ODATA_BASE_URL + SAP_ODATA_USER + SAP_ODATA_PASSWORD are set —
// nothing here runs unless sapODataConfigured() is true and something
// calls discoverSapEntities() explicitly. Follows the same dormant
// pattern as lib/snowflake.ts: real HTTP/XML parsing against the real
// SAP OData metadata document format, just never exercised against a
// live SAP system in this project (no S/4HANA sandbox available).

type SapODataConfig = {
  baseUrl: string;
  user: string;
  password: string;
};

function config(): SapODataConfig {
  const required = ["SAP_ODATA_BASE_URL", "SAP_ODATA_USER", "SAP_ODATA_PASSWORD"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`Missing SAP OData environment variables: ${missing.join(", ")}`);
  return {
    baseUrl: process.env.SAP_ODATA_BASE_URL!.replace(/\/$/, ""),
    user: process.env.SAP_ODATA_USER!,
    password: process.env.SAP_ODATA_PASSWORD!,
  };
}

export function sapODataConfigured() {
  return Boolean(process.env.SAP_ODATA_BASE_URL && process.env.SAP_ODATA_USER && process.env.SAP_ODATA_PASSWORD);
}

function authHeader(c: SapODataConfig) {
  return "Basic " + Buffer.from(`${c.user}:${c.password}`).toString("base64");
}

export async function sapODataHealthy(): Promise<boolean> {
  if (!sapODataConfigured()) return false;
  try {
    const c = config();
    const res = await fetch(`${c.baseUrl}/$metadata`, {
      headers: { Authorization: authHeader(c), Accept: "application/xml" },
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export type SapEntityType = { name: string; properties: { name: string; type: string }[] };

// Parses the real OData $metadata EDMX/CSDL XML format (EntityType /
// Property elements) — the actual document shape SAP Gateway services
// return, not a synthetic stand-in.
export async function discoverSapEntities(servicePath: string): Promise<SapEntityType[]> {
  const c = config();
  const res = await fetch(`${c.baseUrl}/${servicePath.replace(/^\//, "")}/$metadata`, {
    headers: { Authorization: authHeader(c), Accept: "application/xml" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`SAP OData metadata request failed: ${res.status} ${res.statusText}`);
  const xml = await res.text();

  const entities: SapEntityType[] = [];
  const entityTypeRe = /<EntityType\s+Name="([^"]+)"[^>]*>([\s\S]*?)<\/EntityType>/g;
  const propertyRe = /<Property\s+Name="([^"]+)"\s+Type="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = entityTypeRe.exec(xml))) {
    const [, name, body] = m;
    const properties: { name: string; type: string }[] = [];
    let pm: RegExpExecArray | null;
    propertyRe.lastIndex = 0;
    while ((pm = propertyRe.exec(body))) properties.push({ name: pm[1], type: pm[2] });
    entities.push({ name, properties });
  }
  return entities;
}
