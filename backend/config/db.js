// config/db.js
// PostgreSQL connection pool using the 'pg' library.
//
// Usage (in any controller or model):
//   const { query, pool } = require('../config/db');
//   const result = await query('SELECT * FROM users WHERE id = $1', [id]);
//
// Java-style comment: This is a DatabaseConnectionPool singleton.
// A single Pool instance is shared across the entire application
// to avoid exhausting OS-level TCP connections.

require('dotenv').config();
const { Pool } = require('pg');

// ──────────────────────────────────────────────
// PoolConfiguration
// All values fall back to sensible defaults so
// the app starts even without a .env file in dev.
// ──────────────────────────────────────────────
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT, 10) || 5432,
  user:     process.env.DB_USER     || 'lms_user',
  password: process.env.DB_PASSWORD || 'lms_password',
  database: process.env.DB_NAME     || 'lms_db',

  // Connection pool tuning
  max:                    20,     // max simultaneous clients
  idleTimeoutMillis:      30000,  // close idle clients after 30 s
  connectionTimeoutMillis: 2000,  // throw if no connection within 2 s

  // SSL: required for hosted providers (Neon, Supabase, RDS) in production
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

// ──────────────────────────────────────────────
// PoolEventListeners
// Log lifecycle events for observability.
// ──────────────────────────────────────────────
pool.on('connect', (client) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('🐘 PostgreSQL client connected');
  }
});

pool.on('remove', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('🐘 PostgreSQL client removed from pool');
  }
});

pool.on('error', (err, client) => {
  console.error('❌ Unexpected PostgreSQL pool error:', err.message);
  // Exit so the process manager (Docker / PM2) can restart cleanly
  process.exit(1);
});

// ──────────────────────────────────────────────
// query()
// Convenience wrapper — automatically acquires and
// releases a client, and logs slow queries in dev.
//
// @param {string}  text   - Parameterised SQL statement
// @param {Array}   params - Bound parameter values
// @returns {Promise<pg.QueryResult>}
// ──────────────────────────────────────────────
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);

    if (process.env.NODE_ENV !== 'production') {
      const duration = Date.now() - start;
      // Warn when a query takes longer than 200 ms
      if (duration > 200) {
        console.warn(`⚠️  Slow query (${duration}ms):`, text);
      }
    }

    return result;
  } catch (err) {
    console.error('❌ Database query error:', err.message, '\nSQL:', text);
    throw err; // Re-throw so controllers can handle via try/catch
  }
};

// ──────────────────────────────────────────────
// getClient()
// Returns a raw client from the pool for use in
// multi-statement transactions.
//
// IMPORTANT: caller MUST call client.release()
// in a finally block to avoid connection leaks.
//
// @returns {Promise<pg.PoolClient>}
// ──────────────────────────────────────────────
const getClient = async () => {
  const client = await pool.connect();
  const originalRelease = client.release.bind(client);

  // Override release to log any clients that are held too long
  let released = false;
  const timeout = setTimeout(() => {
    if (!released) {
      console.error('❌ A PostgreSQL client has been held for >10 seconds. Possible connection leak!');
    }
  }, 10000);

  client.release = () => {
    released = true;
    clearTimeout(timeout);
    return originalRelease();
  };

  return client;
};

// ──────────────────────────────────────────────
// testConnection()
// Call this during application startup to verify
// the database is reachable before accepting HTTP traffic.
//
// @returns {Promise<void>}
// ──────────────────────────────────────────────
const testConnection = async () => {
  try {
    const { rows } = await pool.query('SELECT NOW() AS server_time');
    console.log(`✅ PostgreSQL connected — server time: ${rows[0].server_time}`);
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
    throw err; // Propagate so server.js can abort startup
  }
};

module.exports = {
  pool,         // Raw pool — use sparingly (prefer query() or getClient())
  query,        // Single-query helper
  getClient,    // Transaction client helper
  testConnection,
};
