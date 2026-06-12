// Model: TokenModel.js
// Manages refresh_tokens table for JWT rotation strategy.
// Tokens are stored as bcrypt hashes to prevent theft on DB compromise.

const { pool } = require("../config/database");

/**
 * TokenModel
 * Data-access methods for the refresh_tokens table.
 */
const TokenModel = {
  /**
   * save - Persists a new hashed refresh token.
   * @param {{ userId, tokenHash, expiresAt }} params
   * @returns {Promise<object>}
   */
  save: async ({ userId, tokenHash, expiresAt }) => {
    const query = `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, created_at
    `;
    const { rows } = await pool.query(query, [userId, tokenHash, expiresAt]);
    return rows[0];
  },

  /**
   * findByUserId - Retrieves all active (non-revoked, non-expired) tokens
   * for a specific user.
   * @param {string} userId
   * @returns {Promise<object[]>}
   */
  findByUserId: async (userId) => {
    const query = `
      SELECT id, token_hash, expires_at, created_at
      FROM refresh_tokens
      WHERE user_id = $1
        AND revoked_at IS NULL
        AND expires_at > NOW()
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
  },

  /**
   * revoke - Soft-deletes a token by marking it as revoked.
   * @param {string} tokenId
   * @returns {Promise<boolean>}
   */
  revoke: async (tokenId) => {
    const { rowCount } = await pool.query(
      "UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL",
      [tokenId]
    );
    return rowCount > 0;
  },

  /**
   * revokeAllForUser - Revokes ALL refresh tokens for a user.
   * Used on password change or suspicious activity detection.
   * @param {string} userId
   * @returns {Promise<number>} - Count of revoked tokens
   */
  revokeAllForUser: async (userId) => {
    const { rowCount } = await pool.query(
      "UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL",
      [userId]
    );
    return rowCount;
  },

  /**
   * cleanExpired - Removes expired tokens from the database.
   * Should be called periodically (e.g. daily cron job).
   * @returns {Promise<number>}
   */
  cleanExpired: async () => {
    const { rowCount } = await pool.query(
      "DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked_at IS NOT NULL"
    );
    return rowCount;
  },
};

module.exports = TokenModel;
