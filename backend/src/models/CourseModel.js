// Model: CourseModel.js
// All database queries for the courses, sections, and lessons tables.
// Joins are pre-built for common query patterns to avoid N+1 problems.

const { pool } = require("../config/database");

/**
 * CourseModel
 * Data-access layer for courses, sections, and lessons.
 */
const CourseModel = {
  // ─────────────────────────── COURSES ────────────────────────────

  /**
   * findAll - Paginated course listing with filtering and search.
   * Only returns published courses for public-facing queries.
   * @param {{ page, limit, status, categoryId, instructorId, search, level }} options
   * @returns {Promise<{ courses, total }>}
   */
  findAll: async ({
    page = 1,
    limit = 12,
    status,
    categoryId,
    instructorId,
    search,
    level,
  }) => {
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`c.status = $${params.length}`);
    }
    if (categoryId) {
      params.push(categoryId);
      conditions.push(`c.category_id = $${params.length}`);
    }
    if (instructorId) {
      params.push(instructorId);
      conditions.push(`c.instructor_id = $${params.length}`);
    }
    if (level) {
      params.push(level);
      conditions.push(`c.level = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(c.title ILIKE $${params.length} OR c.description ILIKE $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const countParams = [...params];
    params.push(limit, offset);

    const query = `
      SELECT
        c.id, c.title, c.slug, c.description, c.thumbnail_url,
        c.price, c.level, c.status, c.total_duration,
        c.enrolled_count, c.rating_avg, c.rating_count,
        c.created_at, c.updated_at,
        u.id   AS instructor_id,
        u.name AS instructor_name,
        u.avatar_url AS instructor_avatar,
        cat.id   AS category_id,
        cat.name AS category_name,
        cat.slug AS category_slug
      FROM courses c
      LEFT JOIN users       u   ON c.instructor_id = u.id
      LEFT JOIN categories  cat ON c.category_id   = cat.id
      ${where}
      ORDER BY c.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    const countQuery = `SELECT COUNT(*) FROM courses c ${where}`;

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    return {
      courses: dataResult.rows,
      total:   parseInt(countResult.rows[0].count),
    };
  },

  /**
   * findById - Fetches a single course with full details.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  findById: async (id) => {
    const query = `
      SELECT
        c.*,
        u.id AS instructor_id, u.name AS instructor_name,
        u.avatar_url AS instructor_avatar, u.bio AS instructor_bio,
        cat.id AS category_id, cat.name AS category_name, cat.slug AS category_slug
      FROM courses c
      LEFT JOIN users      u   ON c.instructor_id = u.id
      LEFT JOIN categories cat ON c.category_id   = cat.id
      WHERE c.id = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  },

  /**
   * findBySlug - Fetches a course by its URL slug.
   * @param {string} slug
   * @returns {Promise<object|null>}
   */
  findBySlug: async (slug) => {
    const query = `
      SELECT
        c.*,
        u.id AS instructor_id, u.name AS instructor_name,
        u.avatar_url AS instructor_avatar, u.bio AS instructor_bio,
        cat.id AS category_id, cat.name AS category_name, cat.slug AS category_slug
      FROM courses c
      LEFT JOIN users      u   ON c.instructor_id = u.id
      LEFT JOIN categories cat ON c.category_id   = cat.id
      WHERE c.slug = $1
    `;
    const { rows } = await pool.query(query, [slug]);
    return rows[0] || null;
  },

  /**
   * create - Inserts a new course record.
   * @param {{ title, slug, description, price, level, instructorId, categoryId }} params
   * @returns {Promise<object>}
   */
  create: async ({ title, slug, description, price, level, instructorId, categoryId }) => {
    const query = `
      INSERT INTO courses (title, slug, description, price, level, instructor_id, category_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const { rows } = await pool.query(query, [
      title, slug, description, price, level, instructorId, categoryId,
    ]);
    return rows[0];
  },

  /**
   * update - Updates mutable course fields.
   * @param {string} id
   * @param {object} updates
   * @returns {Promise<object|null>}
   */
  update: async (id, updates) => {
    const {
      title, slug, description, price, level, status,
      categoryId, thumbnailUrl, previewVideoUrl,
    } = updates;

    const query = `
      UPDATE courses SET
        title             = COALESCE($1,  title),
        slug              = COALESCE($2,  slug),
        description       = COALESCE($3,  description),
        price             = COALESCE($4,  price),
        level             = COALESCE($5,  level),
        status            = COALESCE($6,  status),
        category_id       = COALESCE($7,  category_id),
        thumbnail_url     = COALESCE($8,  thumbnail_url),
        preview_video_url = COALESCE($9,  preview_video_url)
      WHERE id = $10
      RETURNING *
    `;
    const { rows } = await pool.query(query, [
      title, slug, description, price, level, status,
      categoryId, thumbnailUrl, previewVideoUrl, id,
    ]);
    return rows[0] || null;
  },

  /**
   * delete - Permanently removes a course (cascades to sections/lessons).
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  delete: async (id) => {
    const { rowCount } = await pool.query("DELETE FROM courses WHERE id = $1", [id]);
    return rowCount > 0;
  },

  /**
   * updateStats - Recalculates rating_avg, rating_count, enrolled_count
   * and total_duration for a course. Called after review/enrollment changes.
   * @param {string} courseId
   */
  updateStats: async (courseId) => {
    await pool.query(`
      UPDATE courses SET
        rating_avg   = (SELECT COALESCE(AVG(rating), 0)   FROM reviews     WHERE course_id = $1),
        rating_count = (SELECT COUNT(*)                   FROM reviews     WHERE course_id = $1),
        enrolled_count = (SELECT COUNT(*)                 FROM enrollments WHERE course_id = $1 AND status = 'active'),
        total_duration = (
          SELECT COALESCE(SUM(l.duration), 0)
          FROM lessons l
          JOIN sections s ON l.section_id = s.id
          WHERE s.course_id = $1
        )
      WHERE id = $1
    `, [courseId]);
  },

  // ──────────────────────────── SECTIONS ──────────────────────────

  /**
   * findSectionsByCourse - Retrieves ordered sections with nested lessons.
   * @param {string} courseId
   * @returns {Promise<object[]>}
   */
  findSectionsByCourse: async (courseId) => {
    const sectionsQuery = `
      SELECT * FROM sections WHERE course_id = $1 ORDER BY position ASC
    `;
    const lessonsQuery = `
      SELECT l.* FROM lessons l
      JOIN sections s ON l.section_id = s.id
      WHERE s.course_id = $1
      ORDER BY l.section_id, l.position ASC
    `;
    const [sectionsResult, lessonsResult] = await Promise.all([
      pool.query(sectionsQuery, [courseId]),
      pool.query(lessonsQuery, [courseId]),
    ]);

    // Nest lessons inside their parent section
    return sectionsResult.rows.map((section) => ({
      ...section,
      lessons: lessonsResult.rows.filter((l) => l.section_id === section.id),
    }));
  },

  createSection: async ({ courseId, title, position }) => {
    const { rows } = await pool.query(
      `INSERT INTO sections (course_id, title, position) VALUES ($1, $2, $3) RETURNING *`,
      [courseId, title, position]
    );
    return rows[0];
  },

  updateSection: async (id, { title, position }) => {
    const { rows } = await pool.query(
      `UPDATE sections SET
         title    = COALESCE($1, title),
         position = COALESCE($2, position)
       WHERE id = $3 RETURNING *`,
      [title, position, id]
    );
    return rows[0] || null;
  },

  deleteSection: async (id) => {
    const { rowCount } = await pool.query("DELETE FROM sections WHERE id = $1", [id]);
    return rowCount > 0;
  },

  // ──────────────────────────── LESSONS ───────────────────────────

  findLessonById: async (id) => {
    const { rows } = await pool.query("SELECT * FROM lessons WHERE id = $1", [id]);
    return rows[0] || null;
  },

  createLesson: async ({
    sectionId, title, contentType, videoUrl, videoPublicId,
    articleContent, duration, position, isPreview,
  }) => {
    const query = `
      INSERT INTO lessons
        (section_id, title, content_type, video_url, video_public_id,
         article_content, duration, position, is_preview)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `;
    const { rows } = await pool.query(query, [
      sectionId, title, contentType, videoUrl, videoPublicId,
      articleContent, duration, position, isPreview,
    ]);
    return rows[0];
  },

  updateLesson: async (id, updates) => {
    const { title, videoUrl, videoPublicId, articleContent, duration, position, isPreview } = updates;
    const query = `
      UPDATE lessons SET
        title           = COALESCE($1,  title),
        video_url       = COALESCE($2,  video_url),
        video_public_id = COALESCE($3,  video_public_id),
        article_content = COALESCE($4,  article_content),
        duration        = COALESCE($5,  duration),
        position        = COALESCE($6,  position),
        is_preview      = COALESCE($7,  is_preview)
      WHERE id = $8 RETURNING *
    `;
    const { rows } = await pool.query(query, [
      title, videoUrl, videoPublicId, articleContent, duration, position, isPreview, id,
    ]);
    return rows[0] || null;
  },

  deleteLesson: async (id) => {
    const { rowCount } = await pool.query("DELETE FROM lessons WHERE id = $1", [id]);
    return rowCount > 0;
  },
};

module.exports = CourseModel;
