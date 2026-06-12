// Controller: CourseController.js
// Business logic for course CRUD, section management, and lesson management.
// Instructors manage their own courses; admins have elevated access.

const slugify = require("slugify");
const CourseModel  = require("../models/CourseModel");
const { deleteFromCloudinary } = require("../config/cloudinary");
const { setCache, getCache, deleteCache, deletePattern } = require("../config/redis");
const { ApiError }  = require("../utils/ApiError");
const { sendResponse, buildPagination } = require("../utils/ApiResponse");

// Cache TTL: 5 minutes for course listings
const CACHE_TTL = 300;

/**
 * CourseController
 * All business logic for the /api/courses endpoint tree.
 */
const CourseController = {
  // ─────────────────────────── COURSES ────────────────────────────

  /**
   * getAllCourses
   * GET /api/courses
   * Publicly accessible with optional filters. Results are Redis-cached.
   */
  getAllCourses: async (req, res, next) => {
    try {
      const {
        page = 1, limit = 12,
        status = "published", categoryId, level, search,
      } = req.query;

      const cacheKey = `courses:${JSON.stringify(req.query)}`;
      const cached   = await getCache(cacheKey);
      if (cached) {
        return sendResponse(res, 200, "Courses retrieved (cached)", cached.courses, cached.pagination);
      }

      const { courses, total } = await CourseModel.findAll({
        page:         parseInt(page),
        limit:        parseInt(limit),
        status,
        categoryId,
        level,
        search,
      });

      const pagination = buildPagination(parseInt(page), parseInt(limit), total);
      await setCache(cacheKey, { courses, pagination }, CACHE_TTL);

      return sendResponse(res, 200, "Courses retrieved successfully", courses, pagination);
    } catch (err) {
      next(err);
    }
  },

  /**
   * getCourseBySlug
   * GET /api/courses/:slug
   * Fetches a full course (with sections/lessons) by its URL slug.
   */
  getCourseBySlug: async (req, res, next) => {
    try {
      const { slug } = req.params;
      const cacheKey = `course:${slug}`;

      const cached = await getCache(cacheKey);
      if (cached) {
        return sendResponse(res, 200, "Course retrieved (cached)", cached);
      }

      const course = await CourseModel.findBySlug(slug);
      if (!course) {
        throw new ApiError(404, `Course '${slug}' not found`);
      }

      const sections = await CourseModel.findSectionsByCourse(course.id);
      const result   = { ...course, sections };

      await setCache(cacheKey, result, CACHE_TTL);
      return sendResponse(res, 200, "Course retrieved successfully", result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * getInstructorCourses
   * GET /api/courses/instructor/my-courses
   * Returns all courses belonging to the authenticated instructor.
   */
  getInstructorCourses: async (req, res, next) => {
    try {
      const { page = 1, limit = 10, status } = req.query;

      const { courses, total } = await CourseModel.findAll({
        page:         parseInt(page),
        limit:        parseInt(limit),
        instructorId: req.user.id,
        status,
      });

      const pagination = buildPagination(parseInt(page), parseInt(limit), total);
      return sendResponse(res, 200, "Your courses retrieved", courses, pagination);
    } catch (err) {
      next(err);
    }
  },

  /**
   * createCourse
   * POST /api/courses
   * Creates a new course (instructor/admin only).
   * Automatically generates a URL slug from the title.
   */
  createCourse: async (req, res, next) => {
    try {
      const { title, description, price = 0, level = "beginner", categoryId } = req.body;

      // Generate a unique, URL-friendly slug
      let slug = slugify(title, { lower: true, strict: true });
      const existing = await CourseModel.findBySlug(slug);
      if (existing) {
        slug = `${slug}-${Date.now()}`; // Ensure uniqueness with timestamp suffix
      }

      const thumbnailUrl = req.file ? req.file.path : null;

      const course = await CourseModel.create({
        title,
        slug,
        description,
        price,
        level,
        instructorId: req.user.id,
        categoryId,
        thumbnailUrl,
      });

      // Invalidate the course listing cache
      await deletePattern("courses:*");

      return sendResponse(res, 201, "Course created successfully", course);
    } catch (err) {
      next(err);
    }
  },

  /**
   * updateCourse
   * PUT /api/courses/:id
   * Updates course metadata. Instructors can only edit their own courses.
   */
  updateCourse: async (req, res, next) => {
    try {
      const { id } = req.params;

      const existingCourse = await CourseModel.findById(id);
      if (!existingCourse) {
        throw new ApiError(404, "Course not found");
      }

      // Ownership check: non-admin instructors can only edit their own courses
      if (
        req.user.role !== "admin" &&
        existingCourse.instructor_id !== req.user.id
      ) {
        throw new ApiError(403, "You do not have permission to edit this course");
      }

      const updates = { ...req.body };

      // Handle thumbnail replacement
      if (req.file) {
        updates.thumbnailUrl = req.file.path;
      }

      // Re-slug if title changed
      if (updates.title && updates.title !== existingCourse.title) {
        updates.slug = slugify(updates.title, { lower: true, strict: true });
      }

      const updated = await CourseModel.update(id, updates);

      // Bust caches for this specific course and the listing
      await deleteCache(`course:${existingCourse.slug}`);
      await deletePattern("courses:*");

      return sendResponse(res, 200, "Course updated successfully", updated);
    } catch (err) {
      next(err);
    }
  },

  /**
   * deleteCourse
   * DELETE /api/courses/:id
   * Permanently removes a course and all its media from Cloudinary.
   */
  deleteCourse: async (req, res, next) => {
    try {
      const { id } = req.params;

      const course = await CourseModel.findById(id);
      if (!course) {
        throw new ApiError(404, "Course not found");
      }

      if (req.user.role !== "admin" && course.instructor_id !== req.user.id) {
        throw new ApiError(403, "You do not have permission to delete this course");
      }

      // Cascade-delete handles DB records; clean up Cloudinary separately
      const sections = await CourseModel.findSectionsByCourse(id);
      for (const section of sections) {
        for (const lesson of section.lessons) {
          if (lesson.video_public_id) {
            await deleteFromCloudinary(lesson.video_public_id, "video").catch(() => {});
          }
        }
      }

      await CourseModel.delete(id);

      await deleteCache(`course:${course.slug}`);
      await deletePattern("courses:*");

      return sendResponse(res, 200, "Course deleted successfully");
    } catch (err) {
      next(err);
    }
  },

  // ────────────────────────── SECTIONS ────────────────────────────

  /**
   * addSection
   * POST /api/courses/:courseId/sections
   * Adds a new section to a course.
   */
  addSection: async (req, res, next) => {
    try {
      const { courseId } = req.params;
      const { title, position = 0 } = req.body;

      const course = await CourseModel.findById(courseId);
      if (!course) throw new ApiError(404, "Course not found");

      if (req.user.role !== "admin" && course.instructor_id !== req.user.id) {
        throw new ApiError(403, "Access denied");
      }

      const section = await CourseModel.createSection({ courseId, title, position });
      await deleteCache(`course:${course.slug}`);

      return sendResponse(res, 201, "Section added successfully", section);
    } catch (err) {
      next(err);
    }
  },

  /**
   * updateSection
   * PUT /api/courses/:courseId/sections/:sectionId
   */
  updateSection: async (req, res, next) => {
    try {
      const { courseId, sectionId } = req.params;
      const { title, position }     = req.body;

      const course = await CourseModel.findById(courseId);
      if (!course) throw new ApiError(404, "Course not found");

      if (req.user.role !== "admin" && course.instructor_id !== req.user.id) {
        throw new ApiError(403, "Access denied");
      }

      const section = await CourseModel.updateSection(sectionId, { title, position });
      if (!section) throw new ApiError(404, "Section not found");

      await deleteCache(`course:${course.slug}`);
      return sendResponse(res, 200, "Section updated", section);
    } catch (err) {
      next(err);
    }
  },

  /**
   * deleteSection
   * DELETE /api/courses/:courseId/sections/:sectionId
   */
  deleteSection: async (req, res, next) => {
    try {
      const { courseId, sectionId } = req.params;

      const course = await CourseModel.findById(courseId);
      if (!course) throw new ApiError(404, "Course not found");

      if (req.user.role !== "admin" && course.instructor_id !== req.user.id) {
        throw new ApiError(403, "Access denied");
      }

      const deleted = await CourseModel.deleteSection(sectionId);
      if (!deleted) throw new ApiError(404, "Section not found");

      await deleteCache(`course:${course.slug}`);
      return sendResponse(res, 200, "Section deleted");
    } catch (err) {
      next(err);
    }
  },

  // ──────────────────────────── LESSONS ───────────────────────────

  /**
   * addLesson
   * POST /api/courses/:courseId/sections/:sectionId/lessons
   * Supports video uploads (via Cloudinary) and article content.
   */
  addLesson: async (req, res, next) => {
    try {
      const { courseId, sectionId } = req.params;
      const {
        title, contentType = "video",
        articleContent, duration = 0, position = 0, isPreview = false,
      } = req.body;

      const course = await CourseModel.findById(courseId);
      if (!course) throw new ApiError(404, "Course not found");

      if (req.user.role !== "admin" && course.instructor_id !== req.user.id) {
        throw new ApiError(403, "Access denied");
      }

      let videoUrl      = null;
      let videoPublicId = null;

      if (contentType === "video" && req.file) {
        videoUrl      = req.file.path;
        videoPublicId = req.file.filename;
      } else if (contentType === "video" && !req.file) {
        throw new ApiError(400, "Video file is required for video lessons");
      }

      const lesson = await CourseModel.createLesson({
        sectionId, title, contentType,
        videoUrl, videoPublicId,
        articleContent, duration: parseInt(duration),
        position: parseInt(position), isPreview: Boolean(isPreview),
      });

      // Recalculate total_duration on the course
      await CourseModel.updateStats(courseId);
      await deleteCache(`course:${course.slug}`);

      return sendResponse(res, 201, "Lesson added successfully", lesson);
    } catch (err) {
      next(err);
    }
  },

  /**
   * updateLesson
   * PUT /api/courses/:courseId/sections/:sectionId/lessons/:lessonId
   */
  updateLesson: async (req, res, next) => {
    try {
      const { courseId, lessonId } = req.params;

      const course = await CourseModel.findById(courseId);
      if (!course) throw new ApiError(404, "Course not found");

      if (req.user.role !== "admin" && course.instructor_id !== req.user.id) {
        throw new ApiError(403, "Access denied");
      }

      const updates = { ...req.body };

      if (req.file) {
        // Delete the old Cloudinary video if replacing
        const existingLesson = await CourseModel.findLessonById(lessonId);
        if (existingLesson && existingLesson.video_public_id) {
          await deleteFromCloudinary(existingLesson.video_public_id, "video").catch(() => {});
        }
        updates.videoUrl      = req.file.path;
        updates.videoPublicId = req.file.filename;
      }

      const lesson = await CourseModel.updateLesson(lessonId, updates);
      if (!lesson) throw new ApiError(404, "Lesson not found");

      await CourseModel.updateStats(courseId);
      await deleteCache(`course:${course.slug}`);

      return sendResponse(res, 200, "Lesson updated", lesson);
    } catch (err) {
      next(err);
    }
  },

  /**
   * deleteLesson
   * DELETE /api/courses/:courseId/sections/:sectionId/lessons/:lessonId
   */
  deleteLesson: async (req, res, next) => {
    try {
      const { courseId, lessonId } = req.params;

      const course = await CourseModel.findById(courseId);
      if (!course) throw new ApiError(404, "Course not found");

      if (req.user.role !== "admin" && course.instructor_id !== req.user.id) {
        throw new ApiError(403, "Access denied");
      }

      const lesson = await CourseModel.findLessonById(lessonId);
      if (!lesson) throw new ApiError(404, "Lesson not found");

      // Delete from Cloudinary before removing DB record
      if (lesson.video_public_id) {
        await deleteFromCloudinary(lesson.video_public_id, "video").catch(() => {});
      }

      await CourseModel.deleteLesson(lessonId);
      await CourseModel.updateStats(courseId);
      await deleteCache(`course:${course.slug}`);

      return sendResponse(res, 200, "Lesson deleted");
    } catch (err) {
      next(err);
    }
  },
};

module.exports = CourseController;
