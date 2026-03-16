-- Migration: 20260312_001_password_reset_tokens_and_indexes
-- Purpose:
-- 1) Ensure password_reset_tokens exists and is compatible with current backend logic.
-- 2) Add performance indexes used by API query patterns.
--
-- Safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1) password_reset_tokens compatibility
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_id   SERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'password_reset_tokens'
  ) THEN
    -- Add columns for older table variants that may not have the full shape.
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'password_reset_tokens' AND column_name = 'token_id'
    ) THEN
      ALTER TABLE password_reset_tokens ADD COLUMN token_id BIGINT;
      CREATE SEQUENCE IF NOT EXISTS password_reset_tokens_token_id_seq;
      ALTER TABLE password_reset_tokens
        ALTER COLUMN token_id SET DEFAULT nextval('password_reset_tokens_token_id_seq');
      UPDATE password_reset_tokens
      SET token_id = nextval('password_reset_tokens_token_id_seq')
      WHERE token_id IS NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'password_reset_tokens' AND column_name = 'user_id'
    ) THEN
      ALTER TABLE password_reset_tokens ADD COLUMN user_id UUID;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'password_reset_tokens' AND column_name = 'token'
    ) THEN
      ALTER TABLE password_reset_tokens ADD COLUMN token TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'password_reset_tokens' AND column_name = 'expires_at'
    ) THEN
      ALTER TABLE password_reset_tokens ADD COLUMN expires_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'password_reset_tokens' AND column_name = 'used'
    ) THEN
      ALTER TABLE password_reset_tokens ADD COLUMN used BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'password_reset_tokens' AND column_name = 'created_at'
    ) THEN
      ALTER TABLE password_reset_tokens ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- Normalize defaults/nullability where safe.
    ALTER TABLE password_reset_tokens ALTER COLUMN used SET DEFAULT FALSE;
    UPDATE password_reset_tokens SET used = FALSE WHERE used IS NULL;
    ALTER TABLE password_reset_tokens ALTER COLUMN used SET NOT NULL;

    -- token should be present for active reset flow.
    UPDATE password_reset_tokens
    SET token = gen_random_uuid()::text
    WHERE token IS NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_tokens_token
  ON password_reset_tokens (token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
  ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
  ON password_reset_tokens (expires_at);

-- -----------------------------------------------------------------------------
-- 2) Missing indexes for common API query paths
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_users_lower_email ON users (LOWER(email))';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users (updated_at)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='skin_assessments') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_skin_assessments_user_date ON skin_assessments (user_id, assessment_date DESC)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='assessment_answers') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_assessment_answers_assessment_id ON assessment_answers (assessment_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_assessment_answers_question_id ON assessment_answers (question_id)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='skin_questions') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_skin_questions_display_order ON skin_questions (display_order)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='question_options') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_question_options_question_id ON question_options (question_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_question_options_question_value ON question_options (question_id, option_value)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='skin_images') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_skin_images_assessment_id ON skin_images (assessment_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_skin_images_user_id ON skin_images (user_id)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ai_detected_conditions') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ai_detected_conditions_analysis_id ON ai_detected_conditions (analysis_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ai_detected_conditions_condition_id ON ai_detected_conditions (condition_id)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='recommendations') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_recommendations_assessment_id_created_at ON recommendations (assessment_id, created_at)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='weather_logs') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_weather_logs_assessment_id ON weather_logs (assessment_id)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ai_chat_conversations') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ai_chat_conversations_user_updated ON ai_chat_conversations (user_id, updated_at DESC)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ai_chat_messages') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_conversation_created ON ai_chat_messages (conversation_id, created_at)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='support_messages') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_support_messages_status ON support_messages (status)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='admin_reports') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_admin_reports_generated_by ON admin_reports (generated_by)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_admin_reports_created_at ON admin_reports (created_at DESC)';
  END IF;
END $$;
