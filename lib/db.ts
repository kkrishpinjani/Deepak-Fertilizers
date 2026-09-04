import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || "127.0.0.1",
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER || "root",
      password: process.env.MYSQL_PASSWORD || "",
      waitForConnections: true,
      connectionLimit: 5,
      decimalNumbers: true,
      // mysql2 defaults the connection to utf8mb4_unicode_ci regardless of the
      // server's actual default, which mismatches MySQL 8.0's own default
      // (utf8mb4_0900_ai_ci) and breaks comparisons against literals produced
      // by views (e.g. CASE-derived columns) — ER_CANT_AGGREGATE_2COLLATIONS.
      charset: "UTF8MB4_0900_AI_CI",
    });
  }
  return pool;
}

export async function runQuery<T = any>(sql: string): Promise<T[]> {
  const [rows] = await getPool().query(sql);
  return rows as T[];
}

// Parameterized variant — use this whenever any part of the query
// includes user-supplied text (e.g. a free-typed question), so mysql2
// escapes it rather than string-concatenating raw input into SQL.
export async function runParamQuery<T = any>(sql: string, params: any[]): Promise<T[]> {
  const [rows] = await getPool().query(sql, params);
  return rows as T[];
}
