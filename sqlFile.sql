-- =========================
-- 0) Extensions
-- =========================
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- gen_random_uuid()

-- =========================
-- 1) Enums
-- =========================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user','admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active','inactive','banned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE assessment_status AS ENUM ('pending','completed','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE skin_type_enum AS ENUM ('oily','dry','combination','normal','sensitive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sun_exposure_enum AS ENUM ('low','medium','high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE severity_enum AS ENUM ('mild','moderate','severe');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE recommendation_type_enum AS ENUM ('product','routine','lifestyle');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE priority_enum AS ENUM ('high','medium','low');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE chat_sender_enum AS ENUM ('user','ai');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE chat_session_status AS ENUM ('active','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE contact_category_enum AS ENUM ('general','technical','billing');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE contact_status_enum AS ENUM ('new','in_progress','resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- 2) USERS
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password      TEXT NOT NULL,                 -- bcrypt hash
  role          user_role NOT NULL DEFAULT 'user',
  status        user_status NOT NULL DEFAULT 'active',
  profile_photo TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- =========================
-- 3) ASSESSMENTS
-- =========================
CREATE TABLE IF NOT EXISTS assessments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessment_date  TIMESTAMPTZ NOT NULL DEFAULT now(),
  skin_health_score INT CHECK (skin_health_score BETWEEN 0 AND 100),
  photo_url        TEXT,
  status           assessment_status NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_date ON assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_assessments_score ON assessments(skin_health_score);

-- =========================
-- 4) QUESTIONNAIRE_RESPONSES (1-1 with assessment)
-- =========================
CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id  UUID NOT NULL UNIQUE REFERENCES assessments(id) ON DELETE CASCADE,
  skin_type      skin_type_enum NOT NULL,
  concerns       JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of strings
  age_range      VARCHAR(20) NOT NULL,
  current_routine TEXT NOT NULL,
  allergies      TEXT,
  sun_exposure   sun_exposure_enum NOT NULL,
  location       VARCHAR(255) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questionnaire_skin_type ON questionnaire_responses(skin_type);
CREATE INDEX IF NOT EXISTS idx_questionnaire_concerns_gin ON questionnaire_responses USING GIN (concerns);

-- =========================
-- 5) DETECTED_CONDITIONS (N per assessment)
-- =========================
CREATE TABLE IF NOT EXISTS detected_conditions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id   UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  condition_type  VARCHAR(80) NOT NULL,          -- e.g. acne, hyperpigmentation
  severity        severity_enum NOT NULL,
  confidence_score REAL NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
  location_on_face VARCHAR(80),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conditions_assessment_id ON detected_conditions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_conditions_type ON detected_conditions(condition_type);
CREATE INDEX IF NOT EXISTS idx_conditions_severity ON detected_conditions(severity);

-- =========================
-- 6) RECOMMENDATIONS (N per assessment)
-- =========================
CREATE TABLE IF NOT EXISTS recommendations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id       UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  recommendation_type recommendation_type_enum NOT NULL,
  title               VARCHAR(200) NOT NULL,
  description         TEXT NOT NULL,
  priority            priority_enum NOT NULL DEFAULT 'medium',
  category            VARCHAR(80),                -- moisturizer/cleanser/etc.
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reco_assessment_id ON recommendations(assessment_id);
CREATE INDEX IF NOT EXISTS idx_reco_type ON recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_reco_priority ON recommendations(priority);

-- =========================
-- 7) WEATHER_DATA (1-1 with assessment)
-- =========================
CREATE TABLE IF NOT EXISTS weather_data (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id    UUID NOT NULL UNIQUE REFERENCES assessments(id) ON DELETE CASCADE,
  location         VARCHAR(255) NOT NULL,
  temperature      REAL NOT NULL,
  humidity         REAL NOT NULL,
  uv_index         INT NOT NULL,
  condition        VARCHAR(80) NOT NULL,
  air_quality_index INT,
  fetched_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weather_location ON weather_data(location);
CREATE INDEX IF NOT EXISTS idx_weather_fetched_at ON weather_data(fetched_at);

-- =========================
-- 8) CHAT_SESSIONS
-- =========================
CREATE TABLE IF NOT EXISTS chat_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessment_id  UUID REFERENCES assessments(id) ON DELETE SET NULL,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at       TIMESTAMPTZ,
  total_messages INT NOT NULL DEFAULT 0,
  status         chat_session_status NOT NULL DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_assessment_id ON chat_sessions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_started_at ON chat_sessions(started_at);

-- =========================
-- 9) CHAT_MESSAGES
-- =========================
CREATE TABLE IF NOT EXISTS chat_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender       chat_sender_enum NOT NULL,
  message      TEXT NOT NULL,
  "timestamp"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  context_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages("timestamp");

-- =========================
-- 10) PASSWORD_RESET_TOKENS
-- =========================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_id   SERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reset_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_reset_expires_at ON password_reset_tokens(expires_at);

-- =========================
-- 11) CONTACT_SUBMISSIONS
-- =========================
CREATE TABLE IF NOT EXISTS contact_submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  subject       VARCHAR(200) NOT NULL,
  category      contact_category_enum NOT NULL,
  message       TEXT NOT NULL,
  status        contact_status_enum NOT NULL DEFAULT 'new',
  admin_response TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_contact_user_id ON contact_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_status ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_created_at ON contact_submissions(created_at);

-- =========================
-- 12) ADMIN_ACTIVITY_LOGS
-- =========================
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type    VARCHAR(60) NOT NULL, -- e.g. user_edit, user_ban, report_export
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  description    TEXT,
  metadata       JSONB,
  ip_address     VARCHAR(64),
  "timestamp"    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action_type ON admin_activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_timestamp ON admin_activity_logs("timestamp");

-- =========================
-- 13) SYSTEM_SETTINGS
-- =========================
CREATE TABLE IF NOT EXISTS system_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(120) NOT NULL UNIQUE,
  value       JSONB NOT NULL,
  description TEXT,
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
