// Model: EnrollmentModel.js
// Handles enrollments and lesson progress tracking queries.

const { pool } = require("../config/database");

/**
 * EnrollmentModel
 * Data-access for the enrollments and lesson_progress tables.
 */
const EnrollmentModel = {
  /**
   * enroll - Creates a new enrollment record.
   * Ignores conflicts (duplicate enroll attempts).
   * @param {{ studentId, courseId }} params
   * @returns {Promise<object>}
   */
  enroll: async ({ studentId, courseId }) => {
    const query = `
      INSERT INTO enrollments (student_id, course_id)
      VALUES ($1, $2)
      ON CONFLICT (student_id, course_id) DO NOTHING
      RETURNING *
    `;
    const { rows } = await pool.query(query, [studentId, courseId]);
    return rows[0] || null;
  },

  /**
   * findByStudentAndCourse - Checks if a student is enrolled.
   * @param {{ studentId, courseId }} params
   * @returns {Promise<object|null>}
   */
  findByStudentAndCourse: async ({ studentId, courseId }) => {
    const { rows } = await pool.query(
      "SELECT * FROM enrollments WHERE student_id = $1 AND course_id = $2",
      [studentId, courseId]
    );
    return rows[0] || null;
  },

  /**
   * findByStudent - All courses a student is enrolled in with progress.
   * @param {string} studentId
   * @returns {Promise<object[]>}
   */
  findByStudent: async (studentId) => {
    const query = `
      SELECT
        e.*,
        c.title AS course_title, c.slug AS course_slug,
        c.thumbnail_url, c.level, c.total_duration,
        u.name AS instructor_name
      FROM enrollments e
      JOIN courses c ON e.course_id    = c.id
      JOIN users   u ON c.instructor_id = u.id
      WHERE e.student_id = $1
      ORDER BY e.enrolled_at DESC
    `;
    const { rows } = await pool.query(query, [studentId]);
    return rows;
  },

  /**
   * findByCourse - All students enrolled in a course (instructor/admin view).
   * @param {string} courseId
   * @param {{ page, limit }} options
   * @returns {Promise<{ enrollments, total }>}
   */
  findByCourse: async (courseId, { page = 1, limit = 20 }) => {
    const offset = (page - 1) * limit;
    const query = `
      SELECT
        e.*,
        u.name AS student_name, u.email AS student_email, u.avatar_url
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      WHERE e.course_id = $1
      ORDER BY e.enrolled_at DESC
      LIMIT $2 OFFSET $3
    `;
    const countQuery = `SELECT COUNT(*) FROM enrollments WHERE course_id = $1`;

    const [data, count] = await Promise.all([
      pool.query(query, [courseId, limit, offset]),
      pool.query(countQuery, [courseId]),
    ]);

    return { enrollments: data.rows, total: parseInt(count.rows[0].count) };
  },

  /**
   * updateProgress - Recalculates and updates the course progress percentage.
   * Progress = (completed_lessons / total_lessons) * 100
   * @param {string} enrollmentId
   * @returns {Promise<object>}
   */
  updateProgress: async (enrollmentId) => {
    const query = `
      WITH lesson_counts AS (
        SELECT
          COUNT(*)                                      AS total,
          COUNT(*) FILTER (WHERE lp.is_completed = TRUE) AS completed
        FROM lessons l
        JOIN sections s ON l.section_id = s.id
        JOIN enrollments e ON s.course_id = e.course_id
        LEFT JOIN lesson_progress lp
          ON lp.lesson_id = l.id AND lp.enrollment_id = e.id
        WHERE e.id = $1
      )
      UPDATE enrollments SET
        progress = CASE
          WHEN (SELECT total FROM lesson_counts) = 0 THEN 0
          ELSE ROUND(
            (SELECT completed::decimal / total * 100 FROM lesson_counts), 2
          )
        END,
        status = CASE
          WHEN (SELECT completed FROM lesson_counts) = (SELECT total FROM lesson_counts)
               AND (SELECT total FROM lesson_counts) > 0
               THEN 'completed'
          ELSE 'active'
        END,
        completed_at = CASE
          WHEN (SELECT completed FROM lesson_counts) = (SELECT total FROM lesson_counts)
               AND (SELECT total FROM lesson_counts) > 0
               THEN NOW()
          ELSE NULL
        END
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await pool.query(query, [enrollmentId]);
    return rows[0];
  },

  // ─────────────────── LESSON PROGRESS ────────────────────────────

  /**
   * markLessonComplete - Upserts a lesson_progress record as completed.
   * @param {{ enrollmentId, lessonId, watchedDuration }} params
   * @returns {Promise<object>}
   */
  markLessonComplete: async ({ enrollmentId, lessonId, watchedDuration }) => {
    const query = `
      INSERT INTO lesson_progress (enrollment_id, lesson_id, is_completed, watched_duration, completed_at)
      VALUES ($1, $2, TRUE, $3, NOW())
      ON CONFLICT (enrollment_id, lesson_id) DO UPDATE SET
        is_completed     = TRUE,
        watched_duration = GREATEST(lesson_progress.watched_duration, $3),
        completed_at     = COALESCE(lesson_progress.completed_at, NOW())
      RETURNING *
    `;
    const { rows } = await pool.query(query, [enrollmentId, lessonId, watchedDuration]);
    return rows[0];
  },

  /**
   * getProgressForEnrollment - Returns completion state for every lesson.
   * @param {string} enrollmentId
   * @returns {Promise<object[]>}
   */
  getProgressForEnrollment: async (enrollmentId) => {
    const query = `
      SELECT lp.*, l.title AS lesson_title, l.duration
      FROM lesson_progress lp
      JOIN lessons l ON lp.lesson_id = l.id
      WHERE lp.enrollment_id = $1
    `;
    const { rows } = await pool.query(query, [enrollmentId]);
    return rows;
  },
};

module.exports = EnrollmentModel;
