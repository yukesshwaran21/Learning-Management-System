// Config: database.js
// Manages the PostgreSQL connection pool using the 'pg' library.
// Pool settings are tuned for production-grade connection management.

const { Pool } = require("pg");

/**
 * PostgreSQLConnectionPool
 * Singleton pool instance shared across the entire application.
 */
const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT) || 5432,
  user:     process.env.DB_USER     || "lms_user",
  password: process.env.DB_PASSWORD || "lms_password",
  database: process.env.DB_NAME     || "lms_db",
  max:               20,   // maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
});

// Log when a new client connects (for debugging purposes)
pool.on("connect", () => {
  if (process.env.NODE_ENV !== "production") {
    console.log("✅ New PostgreSQL client connected");
  }
});

pool.on("error", (err) => {
  console.error("❌ Unexpected PostgreSQL pool error:", err);
  process.exit(1);
});

/**
 * testDatabaseConnection
 * Verifies the database connection on application startup.
 * @returns {Promise<void>}
 */
const testDatabaseConnection = async () => {
  const client = await pool.connect();
  try {
    await client.query("SELECT NOW()");
    console.log("✅ PostgreSQL connected successfully");
  } finally {
    client.release();
  }
};

module.exports = { pool, testDatabaseConnection };
