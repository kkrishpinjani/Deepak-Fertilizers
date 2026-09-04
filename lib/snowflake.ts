// Dormant Snowflake connector, carried over from the doc's "V2 live
// Snowflake" demo package. Inactive by default (DATA_MODE=mysql).
// Set DATA_MODE=snowflake and the SNOWFLAKE_* env vars below to
// activate — nothing here runs unless snowflakeConfigured() is true
// and app/api/query calls it explicitly.
//
// Caveat: the SQL in lib/queries.ts was written and tested against
// MySQL. Unquoted identifiers are case-insensitive in both engines,
// so it will likely run unchanged against a Snowflake CONFORMED
// schema built with the same table/view names — but that has not
// been verified against a real Snowflake account.

import snowflake from "snowflake-sdk";

type SnowflakeConfig = {
  account: string;
  username: string;
  password: string;
  warehouse: string;
  database: string;
  schema: string;
};

function config(): SnowflakeConfig {
  const required = ["SNOWFLAKE_ACCOUNT", "SNOWFLAKE_USER", "SNOWFLAKE_PASSWORD", "SNOWFLAKE_WAREHOUSE"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`Missing Snowflake environment variables: ${missing.join(", ")}`);
  return {
    account: process.env.SNOWFLAKE_ACCOUNT!,
    username: process.env.SNOWFLAKE_USER!,
    password: process.env.SNOWFLAKE_PASSWORD!,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE!,
    database: process.env.SNOWFLAKE_DATABASE || "SAP_ANAPLAN_DEMO",
    schema: process.env.SNOWFLAKE_SCHEMA || "CONFORMED",
  };
}

export function snowflakeConfigured() {
  return [
    process.env.SNOWFLAKE_ACCOUNT,
    process.env.SNOWFLAKE_USER,
    process.env.SNOWFLAKE_PASSWORD,
    process.env.SNOWFLAKE_WAREHOUSE,
  ].every(Boolean);
}

export async function snowflakeHealthy(): Promise<boolean> {
  if (!snowflakeConfigured()) return false;
  try {
    await executeSnowflake("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

export type SnowflakeColumnMeta = { table: string; column: string; dataType: string };

// Real INFORMATION_SCHEMA discovery — the actual system view every
// Snowflake account exposes, queried through the same executeSnowflake()
// path used everywhere else in this dormant connector.
export async function discoverSnowflakeSchema(schema?: string): Promise<SnowflakeColumnMeta[]> {
  const c = config();
  const rows = await executeSnowflake<{ TABLE_NAME: string; COLUMN_NAME: string; DATA_TYPE: string }>(`
    SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
    FROM ${c.database}.INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = '${(schema || c.schema).replace(/'/g, "")}'
    ORDER BY TABLE_NAME, ORDINAL_POSITION;
  `);
  return rows.map((r) => ({ table: r.TABLE_NAME, column: r.COLUMN_NAME, dataType: r.DATA_TYPE }));
}

export async function executeSnowflake<T = Record<string, unknown>>(sqlText: string): Promise<T[]> {
  const c = config();
  const connection = snowflake.createConnection({
    account: c.account,
    username: c.username,
    password: c.password,
    warehouse: c.warehouse,
    database: c.database,
    schema: c.schema,
    application: "sap-anaplan-cortex-demo",
  });

  await new Promise<void>((resolve, reject) => {
    connection.connect((err) => (err ? reject(err) : resolve()));
  });

  try {
    return await new Promise<T[]>((resolve, reject) => {
      connection.execute({
        sqlText,
        complete: (err, _stmt, rows) => (err ? reject(err) : resolve((rows || []) as T[])),
      });
    });
  } finally {
    connection.destroy(() => undefined);
  }
}
