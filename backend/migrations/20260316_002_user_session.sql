-- Migration: 20260316_002_user_session
-- Purpose:
-- 1) Create user_session table for refresh-token backed authentication sessions.
-- 2) Add indexes for active session lookups and expiration cleanup.
--
-- Safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  users_pk_column TEXT;
BEGIN
  SELECT c.column_name
  INTO users_pk_column
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'users'
    AND c.column_name IN ('user_id', 'id')
  ORDER BY CASE WHEN c.column_name = 'user_id' THEN 0 ELSE 1 END
  LIMIT 1;

  IF users_pk_column IS NULL THEN
    RAISE NOTICE 'Skipping user_session migration because users id column was not found.';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_session'
  ) THEN
    EXECUTE format(
      'CREATE TABLE user_session (
         session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         user_id UUID NOT NULL REFERENCES users(%I) ON DELETE CASCADE,
         refresh_token_hash TEXT NOT NULL UNIQUE,
         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
         last_used_at TIMESTAMPTZ,
         expires_at TIMESTAMPTZ NOT NULL,
         revoked_at TIMESTAMPTZ,
         created_ip VARCHAR(64),
         user_agent TEXT
       )',
      users_pk_column
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_session_user_active
  ON user_session (user_id, expires_at)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_session_expires_at
  ON user_session (expires_at);
