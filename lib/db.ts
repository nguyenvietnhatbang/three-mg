import { Pool } from "pg";

declare global {
  var crmDbPool: Pool | undefined;
}

function createPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  return new Pool({
    connectionString: process.env.DATABASE_URL,
  });
}

export const db = globalThis.crmDbPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalThis.crmDbPool = db;
}
