// Middleware: validationMiddleware.js
// Reusable request validation middleware using express-validator.
// Each exported function is a validation chain for a specific route.

const { body, param, query, validationResult } = require("express-validator");
const { ApiError } = require("../utils/ApiError");

/**
 * handleValidationErrors
 * Checks the result of preceding validation chains.
 * If errors exist, throws a 422 ApiError with all field messages.
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({
      field:   e.path,
      message: e.msg,
    }));
    throw new ApiError(422, "Validation failed", formatted);
  }
  next();
};

// ──────────────────────────────────────────────
// AuthValidation
// ──────────────────────────────────────────────

const validateRegister = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2, max: 100 }).withMessage("Name must be 2-100 characters"),
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email address")
    .normalizeEmail(),
  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain uppercase, lowercase, and a number"),
  body("role")
    .optional()
    .isIn(["student", "instructor"]).withMessage("Role must be student or instructor"),
  handleValidationErrors,
];

const validateLogin = [
  body("email").trim().notEmpty().isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidationErrors,
];

// ──────────────────────────────────────────────
// CourseValidation
// ──────────────────────────────────────────────

const validateCreateCourse = [
  body("title")
    .trim()
    .notEmpty().withMessage("Title is required")
    .isLength({ min: 5, max: 255 }).withMessage("Title must be 5-255 characters"),
  body("description")
    .trim()
    .notEmpty().withMessage("Description is required")
    .isLength({ min: 20 }).withMessage("Description must be at least 20 characters"),
  body("price")
    .optional()
    .isFloat({ min: 0 }).withMessage("Price must be a non-negative number"),
  body("level")
    .optional()
    .isIn(["beginner", "intermediate", "advanced"]).withMessage("Invalid level"),
  body("categoryId")
    .optional()
    .isUUID().withMessage("categoryId must be a valid UUID"),
  handleValidationErrors,
];

const validateUpdateCourse = [
  body("title").optional().trim().isLength({ min: 5, max: 255 }),
  body("description").optional().trim().isLength({ min: 20 }),
  body("price").optional().isFloat({ min: 0 }),
  body("level").optional().isIn(["beginner", "intermediate", "advanced"]),
  body("status").optional().isIn(["draft", "published", "archived"]),
  body("categoryId").optional().isUUID(),
  handleValidationErrors,
];

// ──────────────────────────────────────────────
// SectionValidation
// ──────────────────────────────────────────────

const validateSection = [
  body("title").trim().notEmpty().withMessage("Section title is required"),
  body("position").optional().isInt({ min: 0 }),
  handleValidationErrors,
];

// ──────────────────────────────────────────────
// LessonValidation
// ──────────────────────────────────────────────

const validateCreateLesson = [
  body("title").trim().notEmpty().withMessage("Lesson title is required"),
  body("contentType")
    .notEmpty()
    .isIn(["video", "article"]).withMessage("contentType must be video or article"),
  body("position").optional().isInt({ min: 0 }),
  body("isPreview").optional().isBoolean(),
  handleValidationErrors,
];

// ──────────────────────────────────────────────
// ReviewValidation
// ──────────────────────────────────────────────

const validateReview = [
  body("rating")
    .notEmpty().withMessage("Rating is required")
    .isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
  body("comment").optional().trim().isLength({ max: 2000 }),
  handleValidationErrors,
];

// ──────────────────────────────────────────────
// UUIDParam
// ──────────────────────────────────────────────

const validateUUIDParam = (paramName) => [
  param(paramName).isUUID().withMessage(`${paramName} must be a valid UUID`),
  handleValidationErrors,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateCreateCourse,
  validateUpdateCourse,
  validateSection,
  validateCreateLesson,
  validateReview,
  validateUUIDParam,
};
