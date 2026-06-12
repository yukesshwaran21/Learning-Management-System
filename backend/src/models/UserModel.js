// Model: UserModel.js
// Encapsulates all database queries related to the 'users' table.
// No business logic here — only raw SQL interactions.

const { pool } = require("../config/database");

/**
 * UserModel
 * Data-access methods for the users table.
 */
const UserModel = {
  /**
   * findById - Fetches a user by their UUID (excludes password_hash).
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  findById: async (id) => {
    const query = `
      SELECT id, name, email, role, avatar_url, bio, is_active, created_at, updated_at
      FROM users
      WHERE id = $1 AND is_active = TRUE
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  },

  /**
   * findByEmail - Fetches a user by email including password_hash (for auth).
   * @param {string} email
   * @returns {Promise<object|null>}
   */
  findByEmail: async (email) => {
    const query = `
      SELECT id, name, email, password_hash, role, avatar_url, bio, is_active
      FROM users
      WHERE email = $1
    `;
    const { rows } = await pool.query(query, [email.toLowerCase()]);
    return rows[0] || null;
  },

  /**
   * create - Inserts a new user into the database.
   * @param {{ name, email, passwordHash, role }} params
   * @returns {Promise<object>}
   */
  create: async ({ name, email, passwordHash, role = "student" }) => {
    const query = `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role, avatar_url, created_at
    `;
    const { rows } = await pool.query(query, [name, email.toLowerCase(), passwordHash, role]);
    return rows[0];
  },

  /**
   * update - Updates mutable user profile fields.
   * @param {string} id
   * @param {{ name, bio, avatarUrl }} updates
   * @returns {Promise<object|null>}
   */
  update: async (id, { name, bio, avatarUrl }) => {
    const query = `
      UPDATE users
      SET
        name       = COALESCE($1, name),
        bio        = COALESCE($2, bio),
        avatar_url = COALESCE($3, avatar_url)
      WHERE id = $4 AND is_active = TRUE
      RETURNING id, name, email, role, avatar_url, bio, updated_at
    `;
    const { rows } = await pool.query(query, [name, bio, avatarUrl, id]);
    return rows[0] || null;
  },

  /**
   * updatePassword - Updates the user's hashed password.
   * @param {string} id
   * @param {string} newHash
   * @returns {Promise<boolean>}
   */
  updatePassword: async (id, newHash) => {
    const query = `
      UPDATE users SET password_hash = $1 WHERE id = $2 AND is_active = TRUE
    `;
    const result = await pool.query(query, [newHash, id]);
    return result.rowCount > 0;
  },

  /**
   * softDelete - Marks a user as inactive (admin operation).
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  softDelete: async (id) => {
    const { rowCount } = await pool.query(
      "UPDATE users SET is_active = FALSE WHERE id = $1",
      [id]
    );
    return rowCount > 0;
  },

  /**
   * findAll - Paginated list of all users (admin only).
   * @param {{ page, limit, role, search }} options
   * @returns {Promise<{ users, total }>}
   */
  findAll: async ({ page = 1, limit = 20, role, search }) => {
    const offset = (page - 1) * limit;
    const conditions = ["is_active = TRUE"];
    const params = [];

    if (role) {
      params.push(role);
      conditions.push(`role = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }

    const where = conditions.join(" AND ");
    params.push(limit, offset);

    const dataQuery = `
      SELECT id, name, email, role, avatar_url, is_active, created_at
      FROM users
      WHERE ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    const countQuery = `SELECT COUNT(*) FROM users WHERE ${where}`;
    const countParams = params.slice(0, -2);

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, params),
      pool.query(countQuery, countParams),
    ]);

    return {
      users: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
    };
  },
};

module.exports = UserModel;
