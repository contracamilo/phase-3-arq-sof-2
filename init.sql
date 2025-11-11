-- Reminders Service Database Schema
-- Phase 3: Implementation with idempotency support

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for reminder status
CREATE TYPE reminder_status AS ENUM (
  'pending',
  'scheduled',
  'notified',
  'completed',
  'cancelled'
);

-- Create enum for reminder source
CREATE TYPE reminder_source AS ENUM (
  'manual',
  'LMS',
  'calendar',
  'external'
);

-- Reminders table
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  due_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status reminder_status NOT NULL DEFAULT 'pending',
  source reminder_source NOT NULL DEFAULT 'manual',
  advance_minutes INTEGER NOT NULL DEFAULT 15 CHECK (advance_minutes >= 0 AND advance_minutes <= 10080),
  metadata JSONB DEFAULT '{}'::jsonb,
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT future_due_date CHECK (due_at > created_at)
);

-- Idempotency table for POST operations
CREATE TABLE idempotency_keys (
  idempotency_key UUID PRIMARY KEY,
  resource_id UUID NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  request_hash TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  
  -- Index for cleanup
  CONSTRAINT valid_status CHECK (response_status >= 200 AND response_status < 600)
);

-- Indexes for performance
CREATE INDEX idx_reminders_user_id ON reminders(user_id);
CREATE INDEX idx_reminders_status ON reminders(status);
CREATE INDEX idx_reminders_due_at ON reminders(due_at);
CREATE INDEX idx_reminders_user_status ON reminders(user_id, status);
CREATE INDEX idx_reminders_source ON reminders(source);
CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic updated_at
CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired idempotency keys
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS void AS $$
BEGIN
  DELETE FROM idempotency_keys WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE reminders IS 'Stores user reminders with scheduling information';
COMMENT ON TABLE idempotency_keys IS 'Stores idempotency keys for POST operations (24h retention)';
COMMENT ON COLUMN reminders.advance_minutes IS 'Minutes before due_at to send notification (0-10080, max 7 days)';
COMMENT ON COLUMN reminders.metadata IS 'Additional data from external systems (LMS, calendar, etc.)';
COMMENT ON COLUMN idempotency_keys.request_hash IS 'SHA-256 hash of request body for conflict detection';

-- Sample data for testing
INSERT INTO reminders (user_id, title, due_at, advance_minutes, source, metadata) VALUES
  ('user-123', 'Submit Phase 3 assignment', NOW() + INTERVAL '5 days', 60, 'manual', '{"priority": "high"}'),
  ('user-123', 'Review SOA documentation', NOW() + INTERVAL '2 days', 30, 'manual', '{}'),
  ('user-456', 'Midterm exam preparation', NOW() + INTERVAL '7 days', 120, 'LMS', '{"courseId": "CS101", "examType": "midterm"}');
