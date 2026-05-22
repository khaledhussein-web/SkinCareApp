-- ============================================================
-- Glorielle - Current Backend Schema
-- Source of truth for `npm run db:init`
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1) Roles + Users
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
  role_id      SERIAL PRIMARY KEY,
  role_name    VARCHAR(50) NOT NULL UNIQUE,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_role_name ON roles (role_name);

CREATE TABLE IF NOT EXISTS users (
  user_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id        INTEGER NOT NULL REFERENCES roles(role_id),
  full_name      VARCHAR(120) NOT NULL,
  email          VARCHAR(255) NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  gender         VARCHAR(32),
  date_of_birth  DATE,
  phone          VARCHAR(32),
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  is_banned      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users (role_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at);
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users (updated_at);
CREATE INDEX IF NOT EXISTS idx_users_lower_email ON users (LOWER(email));

-- ============================================================
-- 2) Auth session + password reset + profile photo
-- ============================================================

CREATE TABLE IF NOT EXISTS user_session (
  session_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  refresh_token_hash   TEXT NOT NULL UNIQUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at         TIMESTAMPTZ,
  expires_at           TIMESTAMPTZ NOT NULL,
  revoked_at           TIMESTAMPTZ,
  created_ip           VARCHAR(64),
  user_agent           TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_session_user_active
  ON user_session (user_id, expires_at)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_session_expires_at
  ON user_session (expires_at);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_id     SERIAL PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token        TEXT NOT NULL UNIQUE,
  expires_at   TIMESTAMP NOT NULL,
  used         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
  ON password_reset_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
  ON password_reset_tokens (expires_at);

CREATE TABLE IF NOT EXISTS user_profile_photos (
  user_id      UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  image_data   TEXT NOT NULL,
  mime_type    VARCHAR(64),
  file_size    INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3) Questionnaire + assessments + images
-- ============================================================

CREATE TABLE IF NOT EXISTS skin_questions (
  question_id     SERIAL PRIMARY KEY,
  question_text   TEXT NOT NULL UNIQUE,
  question_type   VARCHAR(50) NOT NULL,
  is_required     BOOLEAN NOT NULL DEFAULT TRUE,
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skin_questions_display_order
  ON skin_questions (display_order);

CREATE TABLE IF NOT EXISTS question_options (
  option_id       SERIAL PRIMARY KEY,
  question_id     INTEGER NOT NULL REFERENCES skin_questions(question_id) ON DELETE CASCADE,
  option_text     TEXT NOT NULL,
  option_value    TEXT NOT NULL,
  display_order   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_question_options_question_id
  ON question_options (question_id);

CREATE INDEX IF NOT EXISTS idx_question_options_question_value
  ON question_options (question_id, option_value);

CREATE TABLE IF NOT EXISTS skin_assessments (
  assessment_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  assessment_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status           VARCHAR(30) NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
  notes            TEXT,
  overall_score    INTEGER CHECK (overall_score BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_skin_assessments_user_date
  ON skin_assessments (user_id, assessment_date DESC);

CREATE INDEX IF NOT EXISTS idx_skin_assessments_status
  ON skin_assessments (status);

CREATE TABLE IF NOT EXISTS assessment_answers (
  answer_id            BIGSERIAL PRIMARY KEY,
  assessment_id        UUID NOT NULL REFERENCES skin_assessments(assessment_id) ON DELETE CASCADE,
  question_id          INTEGER NOT NULL REFERENCES skin_questions(question_id) ON DELETE CASCADE,
  answer_text          TEXT NOT NULL,
  selected_option_id   INTEGER REFERENCES question_options(option_id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessment_answers_assessment_id
  ON assessment_answers (assessment_id);

CREATE INDEX IF NOT EXISTS idx_assessment_answers_question_id
  ON assessment_answers (question_id);

CREATE TABLE IF NOT EXISTS skin_images (
  image_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id   UUID NOT NULL REFERENCES skin_assessments(assessment_id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  image_url       TEXT NOT NULL,
  image_type      VARCHAR(20) NOT NULL DEFAULT 'FACE',
  file_name       TEXT,
  mime_type       VARCHAR(100),
  file_size       INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skin_images_assessment_id
  ON skin_images (assessment_id);

CREATE INDEX IF NOT EXISTS idx_skin_images_user_id
  ON skin_images (user_id);

-- ============================================================
-- 4) AI analysis + recommendations + weather
-- ============================================================

CREATE TABLE IF NOT EXISTS skin_conditions (
  condition_id      SERIAL PRIMARY KEY,
  condition_name    VARCHAR(120) NOT NULL UNIQUE,
  description       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_analyses (
  analysis_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id       UUID NOT NULL REFERENCES skin_assessments(assessment_id) ON DELETE CASCADE,
  model_name          VARCHAR(120) NOT NULL,
  model_version       VARCHAR(120),
  summary             TEXT,
  confidence_score    NUMERIC(5,4) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
  analysis_status     VARCHAR(30) NOT NULL DEFAULT 'SUCCESS'
                      CHECK (analysis_status IN ('PENDING', 'SUCCESS', 'FAILED')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_analyses_assessment_id
  ON ai_analyses (assessment_id);

CREATE INDEX IF NOT EXISTS idx_ai_analyses_created_at
  ON ai_analyses (created_at DESC);

CREATE TABLE IF NOT EXISTS ai_detected_conditions (
  detected_condition_id  BIGSERIAL PRIMARY KEY,
  analysis_id            UUID NOT NULL REFERENCES ai_analyses(analysis_id) ON DELETE CASCADE,
  condition_id           INTEGER NOT NULL REFERENCES skin_conditions(condition_id) ON DELETE RESTRICT,
  severity_level         VARCHAR(20) NOT NULL
                         CHECK (severity_level IN ('mild', 'moderate', 'severe')),
  confidence_score       NUMERIC(5,4) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
  detected_area          VARCHAR(120),
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_detected_conditions_analysis_id
  ON ai_detected_conditions (analysis_id);

CREATE INDEX IF NOT EXISTS idx_ai_detected_conditions_condition_id
  ON ai_detected_conditions (condition_id);

CREATE TABLE IF NOT EXISTS recommendations (
  recommendation_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id        UUID NOT NULL REFERENCES skin_assessments(assessment_id) ON DELETE CASCADE,
  analysis_id          UUID REFERENCES ai_analyses(analysis_id) ON DELETE SET NULL,
  recommendation_type  VARCHAR(30) NOT NULL
                       CHECK (recommendation_type IN ('product', 'routine', 'lifestyle')),
  title                VARCHAR(200) NOT NULL,
  details              TEXT NOT NULL,
  priority_level       VARCHAR(20)
                       CHECK (priority_level IS NULL OR priority_level IN ('high', 'medium', 'low')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recommendations_assessment_id_created_at
  ON recommendations (assessment_id, created_at);

CREATE TABLE IF NOT EXISTS weather_logs (
  weather_log_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id       UUID NOT NULL REFERENCES skin_assessments(assessment_id) ON DELETE CASCADE,
  city                VARCHAR(120),
  country             VARCHAR(120),
  temperature         NUMERIC(6,2),
  humidity            NUMERIC(6,2),
  uv_index            NUMERIC(6,2),
  weather_condition   VARCHAR(120),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weather_logs_assessment_id
  ON weather_logs (assessment_id);

-- ============================================================
-- 5) AI chat
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_chat_conversations (
  conversation_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  title             VARCHAR(255),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_conversations_user_updated
  ON ai_chat_conversations (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  message_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES ai_chat_conversations(conversation_id) ON DELETE CASCADE,
  sender_type       VARCHAR(10) NOT NULL CHECK (sender_type IN ('USER', 'AI')),
  message_text      TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_conversation_created
  ON ai_chat_messages (conversation_id, created_at);

-- ============================================================
-- 6) Support + admin reports
-- ============================================================

CREATE TABLE IF NOT EXISTS support_messages (
  support_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(user_id) ON DELETE SET NULL,
  name            VARCHAR(120) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  subject         VARCHAR(255) NOT NULL,
  message         TEXT NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'OPEN'
                  CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_status
  ON support_messages (status);

CREATE INDEX IF NOT EXISTS idx_support_messages_created_at
  ON support_messages (created_at DESC);

CREATE TABLE IF NOT EXISTS admin_reports (
  report_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_by    UUID REFERENCES users(user_id) ON DELETE SET NULL,
  report_type     VARCHAR(60) NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_reports_generated_by
  ON admin_reports (generated_by);

CREATE INDEX IF NOT EXISTS idx_admin_reports_created_at
  ON admin_reports (created_at DESC);

-- ============================================================
-- 7) Baseline seed data
-- ============================================================

INSERT INTO roles (role_name, description)
VALUES
  ('user', 'Default user role'),
  ('admin', 'Administrator role')
ON CONFLICT (role_name) DO NOTHING;
