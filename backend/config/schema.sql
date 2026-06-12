-- ============================================================
-- LMS Database Schema
-- File: backend/config/schema.sql
-- Auto-executed on first Docker startup via:
--   docker-entrypoint-initdb.d/schema.sql
--
-- Java-style naming convention used in all comments.
-- All tables use UUID primary keys for distributed safety.
-- ============================================================

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────────────────────────
-- ENUM: UserRole
-- Restricts the role column to exactly three valid values.
-- ──────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'instructor', 'student');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ──────────────────────────────────────────────────────────────
-- TABLE: users
-- Stores every platform user regardless of role.
-- Passwords are stored as bcrypt hashes, never plaintext.
-- avatar_url references a Cloudinary-hosted image.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       VARCHAR(255)            NOT NULL,
    email      VARCHAR(255) UNIQUE     NOT NULL,
    password   VARCHAR(255)            NOT NULL,         -- bcrypt hash
    role       user_role               NOT NULL DEFAULT 'student',
    avatar_url TEXT,
    created_at TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- TABLE: courses
-- Owned by one instructor (FK → users).
-- is_published controls public visibility.
-- price = 0.00 means the course is free.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
    id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    title         VARCHAR(255)             NOT NULL,
    description   TEXT                     NOT NULL,
    instructor_id UUID                     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    thumbnail_url TEXT,
    price         DECIMAL(10,2)            NOT NULL DEFAULT 0.00,
    is_published  BOOLEAN                  NOT NULL DEFAULT FALSE,
    category      VARCHAR(100),
    created_at    TIMESTAMPTZ              NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- TABLE: lessons
-- Each lesson belongs to one course (FK → courses).
-- order_index controls playback order within a course.
-- is_preview = TRUE means non-enrolled users can watch it.
-- video_url references a Cloudinary-hosted video.
-- duration_seconds is populated after FFmpeg processing.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lessons (
    id               UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id        UUID             NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title            VARCHAR(255)     NOT NULL,
    video_url        TEXT,
    duration_seconds INTEGER          NOT NULL DEFAULT 0,
    order_index      INTEGER          NOT NULL DEFAULT 0,
    is_preview       BOOLEAN          NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- TABLE: enrollments
-- Records a student's enrollment in a course.
-- UNIQUE(student_id, course_id) prevents duplicate enrollments.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrollments (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id  UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    course_id   UUID        NOT NULL REFERENCES courses(id)  ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, course_id)
);

-- ──────────────────────────────────────────────────────────────
-- TABLE: progress
-- Tracks per-lesson watch progress for each student.
-- watched_seconds is updated continuously as the student watches.
-- completed = TRUE when the student finishes the lesson.
-- UNIQUE(student_id, lesson_id) prevents duplicate progress rows.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS progress (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id       UUID        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    lesson_id        UUID        NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    completed        BOOLEAN     NOT NULL DEFAULT FALSE,
    watched_seconds  INTEGER     NOT NULL DEFAULT 0,
    last_watched_at  TIMESTAMPTZ          DEFAULT NOW(),
    UNIQUE (student_id, lesson_id)
);

-- ──────────────────────────────────────────────────────────────
-- TABLE: quizzes
-- One quiz question per row, attached to a specific lesson.
-- options is a JSONB array, e.g.:
--   ["Paris", "London", "Berlin", "Madrid"]
-- correct_answer is a 0-based index into the options array.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quizzes (
    id             UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id      UUID             NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    question       TEXT             NOT NULL,
    options        JSONB            NOT NULL,   -- array of answer strings
    correct_answer INTEGER          NOT NULL,   -- 0-based index
    created_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- TABLE: quiz_attempts
-- Records each time a student answers a quiz question.
-- selected_answer is the 0-based index the student chose.
-- is_correct is pre-computed and stored for fast analytics queries.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id      UUID        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    quiz_id         UUID        NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    selected_answer INTEGER     NOT NULL,    -- 0-based index chosen by student
    is_correct      BOOLEAN     NOT NULL DEFAULT FALSE,
    attempted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- INDEXES
-- Covering the most common query patterns to avoid full scans.
-- ══════════════════════════════════════════════════════════════

-- UserLookup: fast email login
CREATE INDEX IF NOT EXISTS idx_users_email
    ON users(email);

-- CourseListing: filter by instructor or published status
CREATE INDEX IF NOT EXISTS idx_courses_instructor
    ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_published
    ON courses(is_published);
CREATE INDEX IF NOT EXISTS idx_courses_category
    ON courses(category);

-- LessonOrdering: fetch lessons in order for a course
CREATE INDEX IF NOT EXISTS idx_lessons_course_order
    ON lessons(course_id, order_index ASC);

-- EnrollmentLookup: student's course list & course's student list
CREATE INDEX IF NOT EXISTS idx_enrollments_student
    ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course
    ON enrollments(course_id);

-- ProgressLookup: fetch all progress records for a student
CREATE INDEX IF NOT EXISTS idx_progress_student
    ON progress(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_lesson
    ON progress(lesson_id);

-- QuizLookup: fetch all questions for a lesson
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson
    ON quizzes(lesson_id);

-- QuizAttemptLookup: student's full attempt history
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student
    ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz
    ON quiz_attempts(quiz_id);

-- ══════════════════════════════════════════════════════════════
-- SEED DATA
-- Safe to re-run (ON CONFLICT DO NOTHING).
-- Default categories for the course browser.
-- ══════════════════════════════════════════════════════════════
-- (No seed users here — passwords must be hashed by the app layer)
