-- Notification Service Database Initialization
-- PostgreSQL 15+ compatible

-- Create schemas
CREATE SCHEMA IF NOT EXISTS notification;

-- Templates Table
CREATE TABLE IF NOT EXISTS notification.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,
  title_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_templates_code ON notification.templates(code);

-- Deliveries Table
CREATE TABLE IF NOT EXISTS notification.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  template_code VARCHAR(100) NOT NULL REFERENCES notification.templates(code) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'failed', 'cancelled'))
);

CREATE INDEX idx_deliveries_user ON notification.deliveries(user_id);
CREATE INDEX idx_deliveries_status ON notification.deliveries(status);
CREATE INDEX idx_deliveries_template ON notification.deliveries(template_code);
CREATE INDEX idx_deliveries_created ON notification.deliveries(created_at DESC);

-- Dead Letter Queue Table
CREATE TABLE IF NOT EXISTS notification.dlq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_message JSONB NOT NULL,
  reason TEXT NOT NULL,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_attempt TIMESTAMP,
  next_retry TIMESTAMP
);

CREATE INDEX idx_dlq_created ON notification.dlq(created_at DESC);
CREATE INDEX idx_dlq_next_retry ON notification.dlq(next_retry);

-- Device Tokens Table
CREATE TABLE IF NOT EXISTS notification.device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  platform VARCHAR(20) NOT NULL,
  token TEXT NOT NULL,
  app_version VARCHAR(50),
  device_info JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  last_used TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_platform CHECK (platform IN ('ios', 'android', 'web')),
  UNIQUE(user_id, token)
);

CREATE INDEX idx_device_tokens_user ON notification.device_tokens(user_id);
CREATE INDEX idx_device_tokens_active ON notification.device_tokens(is_active);
CREATE INDEX idx_device_tokens_platform ON notification.device_tokens(platform);

-- Insert default templates
INSERT INTO notification.templates (code, title_template, body_template) VALUES
  ('REMINDER_DUE', 'Recordatorio pendiente', 'Tienes un recordatorio pendiente: {{title}}'),
  ('REMINDER_OVERDUE', 'Recordatorio vencido', 'El recordatorio "{{title}}" ha vencido'),
  ('CALENDAR_EVENT', 'Evento de calendario', 'Tienes un evento programado: {{title}}'),
  ('GRADE_AVAILABLE', 'Calificación disponible', 'Tu calificación para "{{subject}}" está disponible')
ON CONFLICT (code) DO NOTHING;

-- Function to cleanup old deliveries
CREATE OR REPLACE FUNCTION notification.cleanup_old_deliveries(days_old INTEGER DEFAULT 90)
RETURNS void AS $$
BEGIN
  DELETE FROM notification.deliveries
  WHERE created_at < NOW() - INTERVAL '1 day' * days_old
    AND status IN ('sent', 'failed');
END;
$$ LANGUAGE plpgsql;

-- Function to mark inactive tokens
CREATE OR REPLACE FUNCTION notification.mark_inactive_tokens(days_inactive INTEGER DEFAULT 30)
RETURNS void AS $$
BEGIN
  UPDATE notification.device_tokens
  SET is_active = FALSE, updated_at = NOW()
  WHERE last_used < NOW() - INTERVAL '1 day' * days_inactive
    AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant privileges
GRANT USAGE ON SCHEMA notification TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA notification TO postgres;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA notification TO postgres;