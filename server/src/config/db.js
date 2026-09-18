import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

export const pool = connectionString
  ? new Pool({ connectionString })
  : null;

export const isDatabaseConfigured = () => Boolean(pool);

export async function testDatabaseConnection() {
  if (!pool) {
    return { connected: false, reason: "DATABASE_URL is not configured" };
  }

  try {
    await pool.query("SELECT 1");
    return { connected: true };
  } catch (error) {
    return { connected: false, reason: error.message };
  }
}
