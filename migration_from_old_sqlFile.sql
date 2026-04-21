-- ============================================================
-- Migration: old sqlFile.sql schema -> current backend schema
-- Date: 2026-04-04
--
-- What this does:
-- 1) Detects and preserves old conflicting tables as *_legacy
-- 2) Creates/ensures the current schema expected by backend/server.js
-- 3) Migrates legacy data into current tables where possible
--
-- Notes:
-- - Safe to run multiple times (idempotent inserts/guards).
-- - Keep legacy tables for rollback/reference.
-- - Recommended: take a DB backup before running.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- A) Detect old conflicting tables and preserve as *_legacy
-- ============================================================
DO $$
DECLARE
  has_old_users BOOLEAN;
BEGIN
  has_old_users :=
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'user_id'
    );

  IF has_old_users THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users_legacy'
    ) THEN
      ALTER TABLE users RENAME TO users_legacy;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'recommendations'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'recommendations' AND column_name = 'description'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'recommendations_legacy'
    ) THEN
      ALTER TABLE recommendations RENAME TO recommendations_legacy;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'password_reset_tokens'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'password_reset_tokens_legacy'
    ) THEN
      ALTER TABLE password_reset_tokens RENAME TO password_reset_tokens_legacy;
    END IF;
  END IF;
END $$;

-- ============================================================
-- B) Ensure current schema (same shape as current sqlFile.sql)
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

INSERT INTO roles (role_name, description)
VALUES
  ('user', 'Default user role'),
  ('admin', 'Administrator role')
ON CONFLICT (role_name) DO NOTHING;

-- ============================================================
-- C) Data migration from old tables
-- ============================================================

-- Users
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users_legacy'
  ) THEN
    INSERT INTO users (
      user_id,
      role_id,
      full_name,
      email,
      password_hash,
      gender,
      date_of_birth,
      phone,
      is_active,
      is_banned,
      created_at,
      updated_at
    )
    SELECT
      u.id AS user_id,
      COALESCE(
        (SELECT r.role_id FROM roles r WHERE LOWER(r.role_name) = LOWER(COALESCE(u.role::text, 'user')) LIMIT 1),
        (SELECT r2.role_id FROM roles r2 WHERE LOWER(r2.role_name) = 'user' LIMIT 1)
      ) AS role_id,
      COALESCE(NULLIF(TRIM(u.name), ''), 'Unknown User') AS full_name,
      LOWER(TRIM(u.email)) AS email,
      u.password AS password_hash,
      NULL::VARCHAR(32) AS gender,
      NULL::DATE AS date_of_birth,
      NULL::VARCHAR(32) AS phone,
      CASE LOWER(COALESCE(u.status::text, 'active'))
        WHEN 'inactive' THEN FALSE
        WHEN 'banned' THEN FALSE
        ELSE TRUE
      END AS is_active,
      CASE LOWER(COALESCE(u.status::text, 'active'))
        WHEN 'banned' THEN TRUE
        ELSE FALSE
      END AS is_banned,
      COALESCE(u.created_at, NOW()) AS created_at,
      COALESCE(u.updated_at, u.created_at, NOW()) AS updated_at
    FROM users_legacy u
    WHERE u.id IS NOT NULL
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO user_profile_photos (user_id, image_data, mime_type, file_size, updated_at)
    SELECT
      u.id AS user_id,
      u.profile_photo AS image_data,
      NULL::VARCHAR(64) AS mime_type,
      0 AS file_size,
      COALESCE(u.updated_at, u.created_at, NOW()) AS updated_at
    FROM users_legacy u
    WHERE u.profile_photo IS NOT NULL
      AND LENGTH(TRIM(u.profile_photo)) > 0
      AND EXISTS (SELECT 1 FROM users n WHERE n.user_id = u.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;

-- Password reset tokens
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'password_reset_tokens_legacy'
  ) THEN
    INSERT INTO password_reset_tokens (token_id, user_id, token, expires_at, used, created_at)
    SELECT
      p.token_id,
      p.user_id,
      p.token,
      p.expires_at::timestamp,
      COALESCE(p.used, FALSE),
      COALESCE(p.created_at::timestamp, CURRENT_TIMESTAMP)
    FROM password_reset_tokens_legacy p
    WHERE EXISTS (SELECT 1 FROM users u WHERE u.user_id = p.user_id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

SELECT setval(
  pg_get_serial_sequence('password_reset_tokens', 'token_id'),
  COALESCE((SELECT MAX(token_id) FROM password_reset_tokens), 1),
  TRUE
);

-- Skin assessments from legacy assessments/questionnaire
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'assessments'
  ) THEN
    INSERT INTO skin_assessments (assessment_id, user_id, assessment_date, status, notes, overall_score)
    SELECT
      a.id AS assessment_id,
      a.user_id,
      COALESCE(a.assessment_date, NOW()) AS assessment_date,
      CASE LOWER(COALESCE(a.status::text, 'pending'))
        WHEN 'completed' THEN 'COMPLETED'
        WHEN 'failed' THEN 'FAILED'
        ELSE 'PENDING'
      END AS status,
      CASE
        WHEN q.assessment_id IS NULL AND a.photo_url IS NULL THEN NULL
        ELSE jsonb_strip_nulls(
          jsonb_build_object(
            'legacyMigration', TRUE,
            'skinType',
              CASE LOWER(COALESCE(q.skin_type::text, ''))
                WHEN 'oily' THEN 'Oily'
                WHEN 'dry' THEN 'Dry'
                WHEN 'combination' THEN 'Combination'
                WHEN 'normal' THEN 'Normal'
                WHEN 'sensitive' THEN 'Sensitive'
                ELSE NULL
              END,
            'questionnaireData',
              CASE
                WHEN q.assessment_id IS NULL THEN NULL
                ELSE jsonb_strip_nulls(
                  jsonb_build_object(
                    'skinType', q.skin_type::text,
                    'concerns', q.concerns,
                    'ageRange', q.age_range,
                    'currentRoutine', q.current_routine,
                    'allergies', q.allergies,
                    'sunExposure', q.sun_exposure::text,
                    'location', q.location
                  )
                )
              END,
            'legacyPhotoUrl', a.photo_url
          )
        )::text
      END AS notes,
      a.skin_health_score AS overall_score
    FROM assessments a
    LEFT JOIN questionnaire_responses q ON q.assessment_id = a.id
    WHERE EXISTS (SELECT 1 FROM users u WHERE u.user_id = a.user_id)
    ON CONFLICT (assessment_id) DO NOTHING;

    INSERT INTO skin_images (image_id, assessment_id, user_id, image_url, image_type, file_name, mime_type, file_size, created_at)
    SELECT
      a.id AS image_id,
      a.id AS assessment_id,
      a.user_id,
      a.photo_url AS image_url,
      'FACE' AS image_type,
      NULL::TEXT AS file_name,
      NULL::VARCHAR(100) AS mime_type,
      NULL::INTEGER AS file_size,
      COALESCE(a.assessment_date, NOW()) AS created_at
    FROM assessments a
    WHERE a.photo_url IS NOT NULL
      AND LENGTH(TRIM(a.photo_url)) > 0
      AND EXISTS (SELECT 1 FROM skin_assessments sa WHERE sa.assessment_id = a.id)
    ON CONFLICT (image_id) DO NOTHING;
  END IF;
END $$;

-- Legacy questionnaire answers into normalized questions/answers
INSERT INTO skin_questions (question_text, question_type, is_required, display_order)
VALUES
  ('Legacy: skin_type', 'single_choice', TRUE, 1001),
  ('Legacy: concerns', 'multi_text', FALSE, 1002),
  ('Legacy: age_range', 'single_choice', FALSE, 1003),
  ('Legacy: current_routine', 'text', FALSE, 1004),
  ('Legacy: allergies', 'text', FALSE, 1005),
  ('Legacy: sun_exposure', 'single_choice', FALSE, 1006),
  ('Legacy: location', 'text', FALSE, 1007)
ON CONFLICT (question_text) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'questionnaire_responses'
  ) THEN
    INSERT INTO assessment_answers (assessment_id, question_id, answer_text, selected_option_id, created_at)
    SELECT q.assessment_id, sq.question_id, q.skin_type::text, NULL, COALESCE(q.created_at, NOW())
    FROM questionnaire_responses q
    JOIN skin_questions sq ON sq.question_text = 'Legacy: skin_type'
    WHERE q.skin_type IS NOT NULL
      AND EXISTS (SELECT 1 FROM skin_assessments sa WHERE sa.assessment_id = q.assessment_id)
      AND NOT EXISTS (
        SELECT 1 FROM assessment_answers aa
        WHERE aa.assessment_id = q.assessment_id AND aa.question_id = sq.question_id
      );

    INSERT INTO assessment_answers (assessment_id, question_id, answer_text, selected_option_id, created_at)
    SELECT
      q.assessment_id,
      sq.question_id,
      CASE
        WHEN q.concerns IS NULL THEN NULL
        WHEN jsonb_typeof(q.concerns) = 'array' THEN (
          SELECT string_agg(elem, ', ')
          FROM jsonb_array_elements_text(q.concerns) AS t(elem)
        )
        ELSE q.concerns::text
      END AS answer_text,
      NULL,
      COALESCE(q.created_at, NOW())
    FROM questionnaire_responses q
    JOIN skin_questions sq ON sq.question_text = 'Legacy: concerns'
    WHERE q.concerns IS NOT NULL
      AND EXISTS (SELECT 1 FROM skin_assessments sa WHERE sa.assessment_id = q.assessment_id)
      AND NOT EXISTS (
        SELECT 1 FROM assessment_answers aa
        WHERE aa.assessment_id = q.assessment_id AND aa.question_id = sq.question_id
      );

    INSERT INTO assessment_answers (assessment_id, question_id, answer_text, selected_option_id, created_at)
    SELECT q.assessment_id, sq.question_id, q.age_range, NULL, COALESCE(q.created_at, NOW())
    FROM questionnaire_responses q
    JOIN skin_questions sq ON sq.question_text = 'Legacy: age_range'
    WHERE q.age_range IS NOT NULL AND LENGTH(TRIM(q.age_range)) > 0
      AND EXISTS (SELECT 1 FROM skin_assessments sa WHERE sa.assessment_id = q.assessment_id)
      AND NOT EXISTS (
        SELECT 1 FROM assessment_answers aa
        WHERE aa.assessment_id = q.assessment_id AND aa.question_id = sq.question_id
      );

    INSERT INTO assessment_answers (assessment_id, question_id, answer_text, selected_option_id, created_at)
    SELECT q.assessment_id, sq.question_id, q.current_routine, NULL, COALESCE(q.created_at, NOW())
    FROM questionnaire_responses q
    JOIN skin_questions sq ON sq.question_text = 'Legacy: current_routine'
    WHERE q.current_routine IS NOT NULL AND LENGTH(TRIM(q.current_routine)) > 0
      AND EXISTS (SELECT 1 FROM skin_assessments sa WHERE sa.assessment_id = q.assessment_id)
      AND NOT EXISTS (
        SELECT 1 FROM assessment_answers aa
        WHERE aa.assessment_id = q.assessment_id AND aa.question_id = sq.question_id
      );

    INSERT INTO assessment_answers (assessment_id, question_id, answer_text, selected_option_id, created_at)
    SELECT q.assessment_id, sq.question_id, q.allergies, NULL, COALESCE(q.created_at, NOW())
    FROM questionnaire_responses q
    JOIN skin_questions sq ON sq.question_text = 'Legacy: allergies'
    WHERE q.allergies IS NOT NULL AND LENGTH(TRIM(q.allergies)) > 0
      AND EXISTS (SELECT 1 FROM skin_assessments sa WHERE sa.assessment_id = q.assessment_id)
      AND NOT EXISTS (
        SELECT 1 FROM assessment_answers aa
        WHERE aa.assessment_id = q.assessment_id AND aa.question_id = sq.question_id
      );

    INSERT INTO assessment_answers (assessment_id, question_id, answer_text, selected_option_id, created_at)
    SELECT q.assessment_id, sq.question_id, q.sun_exposure::text, NULL, COALESCE(q.created_at, NOW())
    FROM questionnaire_responses q
    JOIN skin_questions sq ON sq.question_text = 'Legacy: sun_exposure'
    WHERE q.sun_exposure IS NOT NULL
      AND EXISTS (SELECT 1 FROM skin_assessments sa WHERE sa.assessment_id = q.assessment_id)
      AND NOT EXISTS (
        SELECT 1 FROM assessment_answers aa
        WHERE aa.assessment_id = q.assessment_id AND aa.question_id = sq.question_id
      );

    INSERT INTO assessment_answers (assessment_id, question_id, answer_text, selected_option_id, created_at)
    SELECT q.assessment_id, sq.question_id, q.location, NULL, COALESCE(q.created_at, NOW())
    FROM questionnaire_responses q
    JOIN skin_questions sq ON sq.question_text = 'Legacy: location'
    WHERE q.location IS NOT NULL AND LENGTH(TRIM(q.location)) > 0
      AND EXISTS (SELECT 1 FROM skin_assessments sa WHERE sa.assessment_id = q.assessment_id)
      AND NOT EXISTS (
        SELECT 1 FROM assessment_answers aa
        WHERE aa.assessment_id = q.assessment_id AND aa.question_id = sq.question_id
      );
  END IF;
END $$;

-- Conditions + analyses + detected conditions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'detected_conditions'
  ) THEN
    INSERT INTO skin_conditions (condition_name, description)
    SELECT DISTINCT
      TRIM(dc.condition_type) AS condition_name,
      'Migrated from legacy detected_conditions table' AS description
    FROM detected_conditions dc
    WHERE dc.condition_type IS NOT NULL
      AND LENGTH(TRIM(dc.condition_type)) > 0
    ON CONFLICT (condition_name) DO NOTHING;
  END IF;
END $$;

-- Create one legacy analysis row per migrated assessment (if absent)
INSERT INTO ai_analyses (assessment_id, model_name, model_version, summary, confidence_score, analysis_status, created_at)
SELECT
  sa.assessment_id,
  'legacy-migration' AS model_name,
  'old-sqlFile' AS model_version,
  'Migrated from legacy schema tables' AS summary,
  NULL::NUMERIC(5,4) AS confidence_score,
  'SUCCESS' AS analysis_status,
  COALESCE(sa.assessment_date, NOW()) AS created_at
FROM skin_assessments sa
WHERE NOT EXISTS (
  SELECT 1
  FROM ai_analyses aa
  WHERE aa.assessment_id = sa.assessment_id
    AND aa.model_name = 'legacy-migration'
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'detected_conditions'
  ) THEN
    INSERT INTO ai_detected_conditions (
      analysis_id,
      condition_id,
      severity_level,
      confidence_score,
      detected_area,
      notes,
      created_at
    )
    SELECT
      aa.analysis_id,
      sc.condition_id,
      CASE LOWER(COALESCE(dc.severity::text, 'mild'))
        WHEN 'severe' THEN 'severe'
        WHEN 'moderate' THEN 'moderate'
        ELSE 'mild'
      END AS severity_level,
      dc.confidence_score::NUMERIC(5,4) AS confidence_score,
      dc.location_on_face AS detected_area,
      'Migrated from legacy detected_conditions' AS notes,
      COALESCE(dc.created_at, NOW()) AS created_at
    FROM detected_conditions dc
    JOIN ai_analyses aa
      ON aa.assessment_id = dc.assessment_id
     AND aa.model_name = 'legacy-migration'
    JOIN skin_conditions sc
      ON sc.condition_name = TRIM(dc.condition_type)
    WHERE dc.condition_type IS NOT NULL
      AND LENGTH(TRIM(dc.condition_type)) > 0
      AND NOT EXISTS (
        SELECT 1
        FROM ai_detected_conditions x
        WHERE x.analysis_id = aa.analysis_id
          AND x.condition_id = sc.condition_id
          AND COALESCE(x.detected_area, '') = COALESCE(dc.location_on_face, '')
          AND COALESCE(x.created_at, NOW()) = COALESCE(dc.created_at, NOW())
      );
  END IF;
END $$;

-- Recommendations (old table name may be recommendations_legacy)
DO $$
DECLARE
  src_table TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'recommendations_legacy'
  ) THEN
    src_table := 'recommendations_legacy';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'recommendations'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'recommendations' AND column_name = 'description'
  ) THEN
    src_table := 'recommendations';
  ELSE
    src_table := NULL;
  END IF;

  IF src_table IS NOT NULL THEN
    EXECUTE format($SQL$
      INSERT INTO recommendations (
        recommendation_id,
        assessment_id,
        analysis_id,
        recommendation_type,
        title,
        details,
        priority_level,
        created_at
      )
      SELECT
        r.id AS recommendation_id,
        r.assessment_id,
        aa.analysis_id,
        CASE LOWER(COALESCE(r.recommendation_type::text, 'routine'))
          WHEN 'product' THEN 'product'
          WHEN 'lifestyle' THEN 'lifestyle'
          ELSE 'routine'
        END AS recommendation_type,
        COALESCE(NULLIF(TRIM(r.title), ''), 'Legacy Recommendation') AS title,
        COALESCE(NULLIF(TRIM(r.description), ''), 'Migrated recommendation') AS details,
        CASE LOWER(COALESCE(r.priority::text, ''))
          WHEN 'high' THEN 'high'
          WHEN 'medium' THEN 'medium'
          WHEN 'low' THEN 'low'
          ELSE NULL
        END AS priority_level,
        COALESCE(r.created_at, NOW()) AS created_at
      FROM %I r
      LEFT JOIN ai_analyses aa
        ON aa.assessment_id = r.assessment_id
       AND aa.model_name = 'legacy-migration'
      WHERE EXISTS (SELECT 1 FROM skin_assessments sa WHERE sa.assessment_id = r.assessment_id)
      ON CONFLICT (recommendation_id) DO NOTHING
    $SQL$, src_table);
  END IF;
END $$;

-- Weather logs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'weather_data'
  ) THEN
    INSERT INTO weather_logs (
      weather_log_id,
      assessment_id,
      city,
      country,
      temperature,
      humidity,
      uv_index,
      weather_condition,
      created_at
    )
    SELECT
      w.id AS weather_log_id,
      w.assessment_id,
      w.location AS city,
      NULL::VARCHAR(120) AS country,
      w.temperature,
      w.humidity,
      w.uv_index,
      w.condition AS weather_condition,
      COALESCE(w.fetched_at, NOW()) AS created_at
    FROM weather_data w
    WHERE EXISTS (SELECT 1 FROM skin_assessments sa WHERE sa.assessment_id = w.assessment_id)
    ON CONFLICT (weather_log_id) DO NOTHING;
  END IF;
END $$;

-- Chat migration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'chat_sessions'
  ) THEN
    INSERT INTO ai_chat_conversations (conversation_id, user_id, title, created_at, updated_at)
    SELECT
      cs.id AS conversation_id,
      cs.user_id,
      'Migrated legacy chat session' AS title,
      COALESCE(cs.started_at, NOW()) AS created_at,
      COALESCE(cs.ended_at, cs.started_at, NOW()) AS updated_at
    FROM chat_sessions cs
    WHERE EXISTS (SELECT 1 FROM users u WHERE u.user_id = cs.user_id)
    ON CONFLICT (conversation_id) DO NOTHING;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'chat_messages'
  ) THEN
    INSERT INTO ai_chat_messages (message_id, conversation_id, sender_type, message_text, created_at)
    SELECT
      cm.id AS message_id,
      cm.session_id AS conversation_id,
      CASE LOWER(COALESCE(cm.sender::text, 'user'))
        WHEN 'ai' THEN 'AI'
        ELSE 'USER'
      END AS sender_type,
      cm.message AS message_text,
      COALESCE(cm."timestamp", NOW()) AS created_at
    FROM chat_messages cm
    WHERE EXISTS (SELECT 1 FROM ai_chat_conversations c WHERE c.conversation_id = cm.session_id)
    ON CONFLICT (message_id) DO NOTHING;
  END IF;
END $$;

-- Support messages
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'contact_submissions'
  ) THEN
    INSERT INTO support_messages (support_id, user_id, name, email, subject, message, status, created_at)
    SELECT
      c.id AS support_id,
      c.user_id,
      c.name,
      c.email,
      c.subject,
      c.message,
      CASE LOWER(COALESCE(c.status::text, 'new'))
        WHEN 'resolved' THEN 'RESOLVED'
        WHEN 'in_progress' THEN 'IN_PROGRESS'
        ELSE 'OPEN'
      END AS status,
      COALESCE(c.created_at, NOW()) AS created_at
    FROM contact_submissions c
    WHERE c.name IS NOT NULL
      AND c.email IS NOT NULL
      AND c.subject IS NOT NULL
      AND c.message IS NOT NULL
    ON CONFLICT (support_id) DO NOTHING;
  END IF;
END $$;

-- Admin activity logs -> admin_reports
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'admin_activity_logs'
  ) THEN
    INSERT INTO admin_reports (report_id, generated_by, report_type, notes, created_at)
    SELECT
      a.id AS report_id,
      a.admin_id AS generated_by,
      COALESCE(NULLIF(TRIM(a.action_type), ''), 'legacy-admin-activity') AS report_type,
      jsonb_strip_nulls(
        jsonb_build_object(
          'legacyMigration', TRUE,
          'description', a.description,
          'metadata', a.metadata,
          'ipAddress', a.ip_address,
          'targetUserId', a.target_user_id
        )
      )::text AS notes,
      COALESCE(a."timestamp", NOW()) AS created_at
    FROM admin_activity_logs a
    ON CONFLICT (report_id) DO NOTHING;
  END IF;
END $$;

-- Keep role_id sequence aligned if explicit values were inserted elsewhere.
SELECT setval(
  pg_get_serial_sequence('roles', 'role_id'),
  COALESCE((SELECT MAX(role_id) FROM roles), 1),
  TRUE
);

-- ============================================================
-- End migration
-- ============================================================
