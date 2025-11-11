/**
 * Database Configuration
 * PostgreSQL connection pool setup
 */

import { Pool, QueryResult, QueryResultRow } from "pg";
import winston from "winston";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.json(),
  defaultMeta: { service: "auth-service-db" },
  transports: [new winston.transports.Console()],
});

const connectionString =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/auth_db";

const pool = new Pool({
  connectionString,
  min: parseInt(process.env.DATABASE_POOL_MIN || "2"),
  max: parseInt(process.env.DATABASE_POOL_MAX || "20"),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err: Error) => {
  logger.error("Unexpected error on idle client", err);
  process.exit(-1);
});

/**
 * Query wrapper with logging
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: Array<string | number | boolean | null>
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    logger.debug("Executed query", {
      text: text.substring(0, 100),
      duration,
      rows: result.rowCount,
    });
    return result;
  } catch (error) {
    logger.error("Database query error", { text, error });
    throw error;
  }
}

export default pool;
