// Picks MySQL (default, always works) or the dormant Snowflake
// connector (only if DATA_MODE=snowflake AND Snowflake env vars are
// actually set) for running a verified query's SQL.

import { runQuery as runMysqlQuery } from "./db";
import { executeSnowflake, snowflakeConfigured } from "./snowflake";

export function activeDataMode(): "mysql" | "snowflake" {
  return process.env.DATA_MODE === "snowflake" && snowflakeConfigured() ? "snowflake" : "mysql";
}

export async function runActiveQuery<T = any>(sql: string): Promise<T[]> {
  return activeDataMode() === "snowflake" ? executeSnowflake<T>(sql) : runMysqlQuery<T>(sql);
}
