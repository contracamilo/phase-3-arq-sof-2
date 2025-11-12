-- Init SQL for reminder service schema and idempotency keys
CREATE SCHEMA IF NOT EXISTS reminder;

CREATE TABLE IF NOT EXISTS reminder.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  source TEXT NOT NULL DEFAULT 'manual',
  advance_minutes INT NOT NULL DEFAULT 0,
  notified_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reminder.idempotency_keys (
  idempotency_key TEXT PRIMARY KEY,
  resource_id UUID NOT NULL,
  resource_type TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_status INT NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Optional extensions for UUID generation on Postgres <13
DO $$
BEGIN
  -- Try to create extension if not exists (pgcrypto for gen_random_uuid)
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    BEGIN
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
    EXCEPTION WHEN OTHERS THEN
      -- ignore if cannot create extension
      RAISE NOTICE 'pgcrypto extension not available: %', SQLERRM;
    END;
  END IF;
END$$;
