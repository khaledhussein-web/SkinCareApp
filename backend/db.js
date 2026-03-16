const path = require("path");
const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, ".env") });

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildPoolConfig() {
  const ssl = process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined;

  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl,
      max: toNumber(process.env.DB_MAX_CONNECTIONS, 10),
      idleTimeoutMillis: toNumber(process.env.DB_IDLE_TIMEOUT_MS, 30_000),
      connectionTimeoutMillis: toNumber(process.env.DB_CONNECTION_TIMEOUT_MS, 5_000),
    };
  }

  return {
    host: process.env.DB_HOST || "localhost",
    port: toNumber(process.env.DB_PORT, 5432),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "skincare_db",
    ssl,
    max: toNumber(process.env.DB_MAX_CONNECTIONS, 10),
    idleTimeoutMillis: toNumber(process.env.DB_IDLE_TIMEOUT_MS, 30_000),
    connectionTimeoutMillis: toNumber(process.env.DB_CONNECTION_TIMEOUT_MS, 5_000),
  };
}

const pool = new Pool(buildPoolConfig());

async function query(text, params) {
  return pool.query(text, params);
}

async function checkDbConnection() {
  const result = await query("SELECT NOW() AS connected_at, current_database() AS database_name");
  return result.rows[0];
}

module.exports = {
  pool,
  query,
  checkDbConnection,
};
