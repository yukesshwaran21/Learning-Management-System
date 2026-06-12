// Model: ReviewModel.js
// Manages course reviews and ratings queries.

const { pool } = require("../config/database");

/**
 * ReviewModel
 * Data-access for the reviews table.
 */
const ReviewModel = {
  /**
   * findByCourse - Paginated reviews for a given course.
   * @param {string} courseId
   * @param {{ page, limit }} options
   * @returns {Promise<{ reviews, total }>}
   */
  findByCourse: async (courseId, { page = 1, limit = 10 }) => {
    const offset = (page - 1) * limit;
    const query = `
      SELECT
        r.*,
        u.name AS student_name, u.avatar_url AS student_avatar
      FROM reviews r
      JOIN users u ON r.student_id = u.id
      WHERE r.course_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const countQuery = `SELECT COUNT(*) FROM reviews WHERE course_id = $1`;

    const [data, count] = await Promise.all([
      pool.query(query, [courseId, limit, offset]),
      pool.query(countQuery, [courseId]),
    ]);

    return { reviews: data.rows, total: parseInt(count.rows[0].count) };
  },

  /**
   * findByStudentAndCourse - Checks if a student already reviewed a course.
   * @param {{ studentId, courseId }} params
   * @returns {Promise<object|null>}
   */
  findByStudentAndCourse: async ({ studentId, courseId }) => {
    const { rows } = await pool.query(
      "SELECT * FROM reviews WHERE student_id = $1 AND course_id = $2",
      [studentId, courseId]
    );
    return rows[0] || null;
  },

  /**
   * create - Inserts a new review.
   * @param {{ courseId, studentId, rating, comment }} params
   * @returns {Promise<object>}
   */
  create: async ({ courseId, studentId, rating, comment }) => {
    const query = `
      INSERT INTO reviews (course_id, student_id, rating, comment)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const { rows } = await pool.query(query, [courseId, studentId, rating, comment]);
    return rows[0];
  },

  /**
   * update - Updates an existing review by the student who owns it.
   * @param {string} id
   * @param {{ rating, comment }} params
   * @returns {Promise<object|null>}
   */
  update: async (id, { rating, comment }) => {
    const query = `
      UPDATE reviews SET
        rating  = COALESCE($1, rating),
        comment = COALESCE($2, comment)
      WHERE id = $3
      RETURNING *
    `;
    const { rows } = await pool.query(query, [rating, comment, id]);
    return rows[0] || null;
  },

  /**
   * delete - Removes a review permanently.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  delete: async (id) => {
    const { rowCount } = await pool.query("DELETE FROM reviews WHERE id = $1", [id]);
    return rowCount > 0;
  },
};

module.exports = ReviewModel;
