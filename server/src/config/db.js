import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

export const pool = connectionString
  ? new Pool({ connectionString })
  : null;

export const isDatabaseConfigured = () => Boolean(pool);

// Keeps existing databases compatible with the users-table occupation field.
export async function ensureUserOccupationColumn() {
  if (!pool) return;
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS occupation VARCHAR(120)");
}

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
