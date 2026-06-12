// Utils: jwtUtils.js
// Helper functions for generating and verifying JWT access & refresh tokens.

const jwt  = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

/**
 * generateAccessToken
 * Creates a short-lived JWT (default 15m) for API authentication.
 * Payload includes user id and role for RBAC in middleware.
 *
 * @param {{ id, email, role }} userPayload
 * @returns {string}
 */
const generateAccessToken = (userPayload) => {
  return jwt.sign(
    { id: userPayload.id, email: userPayload.email, role: userPayload.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
  );
};

/**
 * generateRefreshToken
 * Creates a long-lived JWT (default 7d) for token rotation.
 * Stored as a hash in the database (refresh_tokens table).
 *
 * @param {{ id }} userPayload
 * @returns {string}
 */
const generateRefreshToken = (userPayload) => {
  return jwt.sign(
    { id: userPayload.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
  );
};

/**
 * verifyRefreshToken
 * Validates a refresh token signature and expiry.
 *
 * @param {string} token
 * @returns {{ id: string }}
 * @throws {JsonWebTokenError | TokenExpiredError}
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

/**
 * hashToken
 * BCrypt-hashes a raw token before database storage.
 * Prevents token theft even on full DB compromise.
 *
 * @param {string} token
 * @returns {Promise<string>}
 */
const hashToken = async (token) => {
  return bcrypt.hash(token, 10);
};

/**
 * compareToken
 * Compares a raw token against its stored bcrypt hash.
 *
 * @param {string} rawToken
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
const compareToken = async (rawToken, hash) => {
  return bcrypt.compare(rawToken, hash);
};

/**
 * getRefreshTokenExpiry
 * Returns the exact Date object when the refresh token expires.
 * Used when persisting the token to the DB.
 *
 * @returns {Date}
 */
const getRefreshTokenExpiry = () => {
  const days = parseInt(process.env.JWT_REFRESH_EXPIRES_IN) || 7;
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  compareToken,
  getRefreshTokenExpiry,
};
