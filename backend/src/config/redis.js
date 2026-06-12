// Config: redis.js
// Initializes the Redis client using ioredis.
// Used for caching tokens, sessions, and frequently queried data.

const Redis = require("ioredis");

/**
 * RedisClientSingleton
 * Single ioredis instance shared across the application.
 */
const redis = new Redis({
  host:     process.env.REDIS_HOST     || "localhost",
  port:     parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    // Exponential backoff: retry up to 10 times
    if (times > 10) return null;
    return Math.min(times * 200, 2000);
  },
});

redis.on("connect", () => {
  console.log("✅ Redis connected successfully");
});

redis.on("error", (err) => {
  console.error("❌ Redis connection error:", err.message);
});

/**
 * RedisHelpers
 * Utility wrappers for common Redis operations with error handling.
 */

/**
 * setCache - Stores a value in Redis with optional TTL (seconds).
 * @param {string} key
 * @param {any}    value  - Will be JSON-serialised
 * @param {number} [ttl]  - Time-to-live in seconds
 */
const setCache = async (key, value, ttl) => {
  try {
    const serialised = JSON.stringify(value);
    if (ttl) {
      await redis.setex(key, ttl, serialised);
    } else {
      await redis.set(key, serialised);
    }
  } catch (err) {
    console.error(`Redis setCache error [${key}]:`, err.message);
  }
};

/**
 * getCache - Retrieves and deserialises a value from Redis.
 * Returns null on cache miss or error.
 * @param {string} key
 * @returns {Promise<any|null>}
 */
const getCache = async (key) => {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error(`Redis getCache error [${key}]:`, err.message);
    return null;
  }
};

/**
 * deleteCache - Removes one or more keys from Redis.
 * @param {...string} keys
 */
const deleteCache = async (...keys) => {
  try {
    await redis.del(...keys);
  } catch (err) {
    console.error("Redis deleteCache error:", err.message);
  }
};

/**
 * deletePattern - Deletes all keys matching a glob pattern.
 * Use sparingly in production (SCAN-based, not KEYS).
 * @param {string} pattern  e.g. "courses:*"
 */
const deletePattern = async (pattern) => {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.error(`Redis deletePattern error [${pattern}]:`, err.message);
  }
};

module.exports = { redis, setCache, getCache, deleteCache, deletePattern };
