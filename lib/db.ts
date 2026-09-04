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
