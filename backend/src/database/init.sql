-- ============================================================
-- LMS Database Schema (PostgreSQL)
-- Naming Convention: snake_case for tables/columns (Java-style
-- clarity documented via comments above each table)
-- ============================================================

-- Enable UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────────
-- Table: users
-- Represents all system users (admin, instructor, student)
-- Role-based access is enforced at the application layer
-- ──────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('admin', 'instructor', 'student');

CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          VARCHAR(255)        NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255)        NOT NULL,
    role          user_role           NOT NULL DEFAULT 'student',
    avatar_url    TEXT,
    bio           TEXT,
    is_active     BOOLEAN             NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- Table: categories
-- Course categories for organization/filtering
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(150) UNIQUE NOT NULL,
    slug        VARCHAR(150) UNIQUE NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- Table: courses
-- A course belongs to one instructor (user with role=instructor)
-- and one category. Price=0 means free course.
-- ──────────────────────────────────────────────
CREATE TYPE course_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE course_level  AS ENUM ('beginner', 'intermediate', 'advanced');

CREATE TABLE IF NOT EXISTS courses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(255)  NOT NULL,
    slug            VARCHAR(255)  UNIQUE NOT NULL,
    description     TEXT          NOT NULL,
    thumbnail_url   TEXT,
    preview_video_url TEXT,
    price           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    level           course_level  NOT NULL DEFAULT 'beginner',
    status          course_status NOT NULL DEFAULT 'draft',
    instructor_id   UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id     UUID          REFERENCES categories(id) ON DELETE SET NULL,
    total_duration  INTEGER       NOT NULL DEFAULT 0, -- in seconds
    enrolled_count  INTEGER       NOT NULL DEFAULT 0,
    rating_avg      DECIMAL(3,2)  NOT NULL DEFAULT 0.00,
    rating_count    INTEGER       NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- Table: sections
-- A course is divided into ordered sections (chapters)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sections (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id   UUID         NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    position    INTEGER      NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- Table: lessons
-- Individual lessons inside a section.
-- content_type distinguishes video vs article lessons.
-- video_url points to Cloudinary; duration in seconds.
-- ──────────────────────────────────────────────
CREATE TYPE lesson_content_type AS ENUM ('video', 'article');

CREATE TABLE IF NOT EXISTS lessons (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id       UUID                NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    title            VARCHAR(255)        NOT NULL,
    content_type     lesson_content_type NOT NULL DEFAULT 'video',
    video_url        TEXT,
    video_public_id  TEXT,                         -- Cloudinary public_id for deletion
    article_content  TEXT,
    duration         INTEGER             NOT NULL DEFAULT 0,  -- seconds
    position         INTEGER             NOT NULL DEFAULT 0,
    is_preview       BOOLEAN             NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- Table: enrollments
-- Records a student's enrollment in a course.
-- A student can only enroll once in a given course.
-- ──────────────────────────────────────────────
CREATE TYPE enrollment_status AS ENUM ('active', 'completed', 'cancelled');

CREATE TABLE IF NOT EXISTS enrollments (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id   UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id    UUID              NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    status       enrollment_status NOT NULL DEFAULT 'active',
    progress     DECIMAL(5,2)      NOT NULL DEFAULT 0.00, -- percentage 0-100
    enrolled_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(student_id, course_id)
);

-- ──────────────────────────────────────────────
-- Table: lesson_progress
-- Tracks which lessons a student has completed.
-- watched_duration: how many seconds the student watched
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lesson_progress (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id    UUID        NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    lesson_id        UUID        NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    is_completed     BOOLEAN     NOT NULL DEFAULT FALSE,
    watched_duration INTEGER     NOT NULL DEFAULT 0,
    completed_at     TIMESTAMPTZ,
    UNIQUE(enrollment_id, lesson_id)
);

-- ──────────────────────────────────────────────
-- Table: reviews
-- A student can leave one review per enrolled course.
-- rating is between 1 and 5.
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id   UUID        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating      SMALLINT    NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(course_id, student_id)
);

-- ──────────────────────────────────────────────
-- Table: refresh_tokens
-- Stores hashed refresh tokens for JWT rotation.
-- Revoked tokens are soft-deleted via revoked_at.
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- Indexes for common query patterns
-- ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_courses_instructor   ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_category     ON courses(category_id);
CREATE INDEX IF NOT EXISTS idx_courses_status       ON courses(status);
CREATE INDEX IF NOT EXISTS idx_sections_course      ON sections(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_section      ON lessons(section_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student  ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course   ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_enr  ON lesson_progress(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_reviews_course       ON reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user  ON refresh_tokens(user_id);

-- ──────────────────────────────────────────────
-- Function: update_updated_at_column
-- Auto-updates the updated_at timestamp on row change
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to all tables with updated_at
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_sections_updated_at
    BEFORE UPDATE ON sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_lessons_updated_at
    BEFORE UPDATE ON lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────
-- Seed: Default admin user (password: Admin@123)
-- bcrypt hash generated offline for security
-- ──────────────────────────────────────────────
INSERT INTO categories (name, slug, description) VALUES
    ('Web Development',     'web-development',     'Frontend, backend, and full-stack web courses'),
    ('Data Science',        'data-science',         'Python, ML, AI, and analytics courses'),
    ('Mobile Development',  'mobile-development',   'iOS, Android, and cross-platform courses'),
    ('DevOps',              'devops',               'CI/CD, Docker, Kubernetes, and cloud courses'),
    ('Design',              'design',               'UI/UX, graphic design, and Figma courses')
ON CONFLICT DO NOTHING;
