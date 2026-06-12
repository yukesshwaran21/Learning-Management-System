// Routes: courseRoutes.js
// All course, section, and lesson endpoints.
// Public routes use optionalAuthenticate; protected routes require authenticate.

const express = require("express");
const CourseController = require("../controllers/CourseController");
const {
  authenticate,
  authorise,
  optionalAuthenticate,
} = require("../middleware/authMiddleware");
const {
  validateCreateCourse,
  validateUpdateCourse,
  validateSection,
  validateCreateLesson,
} = require("../middleware/validationMiddleware");
const { uploadImage, uploadVideo } = require("../config/cloudinary");

const router = express.Router();

// ──────────────────────────────────────────────
// Public / Optional-Auth Course Routes
// ──────────────────────────────────────────────

// GET  /api/courses           — Browse all published courses (cached)
router.get("/", optionalAuthenticate, CourseController.getAllCourses);

// GET  /api/courses/instructor/my-courses — Instructor's own courses
router.get(
  "/instructor/my-courses",
  authenticate,
  authorise("instructor", "admin"),
  CourseController.getInstructorCourses
);

// GET  /api/courses/:slug     — Get full course detail by slug
router.get("/:slug", optionalAuthenticate, CourseController.getCourseBySlug);

// ──────────────────────────────────────────────
// Protected Course CRUD Routes
// ──────────────────────────────────────────────

// POST   /api/courses         — Create a new course
router.post(
  "/",
  authenticate,
  authorise("instructor", "admin"),
  uploadImage,                   // Cloudinary thumbnail upload
  validateCreateCourse,
  CourseController.createCourse
);

// PUT    /api/courses/:id     — Update course metadata / thumbnail
router.put(
  "/:id",
  authenticate,
  authorise("instructor", "admin"),
  uploadImage,
  validateUpdateCourse,
  CourseController.updateCourse
);

// DELETE /api/courses/:id     — Delete a course and all its media
router.delete(
  "/:id",
  authenticate,
  authorise("instructor", "admin"),
  CourseController.deleteCourse
);

// ──────────────────────────────────────────────
// Section Routes (nested under course)
// ──────────────────────────────────────────────

// POST   /api/courses/:courseId/sections
router.post(
  "/:courseId/sections",
  authenticate,
  authorise("instructor", "admin"),
  validateSection,
  CourseController.addSection
);

// PUT    /api/courses/:courseId/sections/:sectionId
router.put(
  "/:courseId/sections/:sectionId",
  authenticate,
  authorise("instructor", "admin"),
  validateSection,
  CourseController.updateSection
);

// DELETE /api/courses/:courseId/sections/:sectionId
router.delete(
  "/:courseId/sections/:sectionId",
  authenticate,
  authorise("instructor", "admin"),
  CourseController.deleteSection
);

// ──────────────────────────────────────────────
// Lesson Routes (nested under section)
// ──────────────────────────────────────────────

// POST   /api/courses/:courseId/sections/:sectionId/lessons
router.post(
  "/:courseId/sections/:sectionId/lessons",
  authenticate,
  authorise("instructor", "admin"),
  uploadVideo,                   // Cloudinary video upload
  validateCreateLesson,
  CourseController.addLesson
);

// PUT    /api/courses/:courseId/sections/:sectionId/lessons/:lessonId
router.put(
  "/:courseId/sections/:sectionId/lessons/:lessonId",
  authenticate,
  authorise("instructor", "admin"),
  uploadVideo,
  CourseController.updateLesson
);

// DELETE /api/courses/:courseId/sections/:sectionId/lessons/:lessonId
router.delete(
  "/:courseId/sections/:sectionId/lessons/:lessonId",
  authenticate,
  authorise("instructor", "admin"),
  CourseController.deleteLesson
);

module.exports = router;
