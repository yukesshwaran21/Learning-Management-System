// Routes: enrollmentRoutes.js
// Enrollment and lesson progress endpoints.

const express = require("express");
const EnrollmentController = require("../controllers/EnrollmentController");
const { authenticate, authorise } = require("../middleware/authMiddleware");

const router = express.Router();

// POST   /api/enrollments/:courseId         — Enroll in a course (student)
router.post(
  "/:courseId",
  authenticate,
  authorise("student"),
  EnrollmentController.enroll
);

// GET    /api/enrollments/my               — Get my enrolled courses
router.get(
  "/my",
  authenticate,
  authorise("student"),
  EnrollmentController.getMyEnrollments
);

// GET    /api/enrollments/course/:courseId — Get all enrollments for a course
router.get(
  "/course/:courseId",
  authenticate,
  authorise("instructor", "admin"),
  EnrollmentController.getCourseEnrollments
);

// POST   /api/enrollments/:courseId/lessons/:lessonId/complete
//        — Mark a lesson as complete and update progress
router.post(
  "/:courseId/lessons/:lessonId/complete",
  authenticate,
  authorise("student"),
  EnrollmentController.markLessonComplete
);

// GET    /api/enrollments/:courseId/progress — Get detailed lesson progress
router.get(
  "/:courseId/progress",
  authenticate,
  authorise("student"),
  EnrollmentController.getCourseProgress
);

module.exports = router;
