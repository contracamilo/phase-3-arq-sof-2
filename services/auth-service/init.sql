-- Auth Service Database Initialization
-- PostgreSQL 15+ compatible

-- Create database (only if running standalone)
-- CREATE DATABASE auth_db;

-- Create schemas
CREATE SCHEMA IF NOT EXISTS auth;

-- Auth Sessions Table
CREATE TABLE IF NOT EXISTS auth.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  refresh_token_hash CHAR(64) NOT NULL UNIQUE,
  access_token_jti VARCHAR(255),
  ip_address INET NOT NULL,
  user_agent TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  last_activity TIMESTAMP NOT NULL DEFAULT NOW(),
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP,
  
  CONSTRAINT valid_dates CHECK (expires_at > created_at)
);

CREATE INDEX idx_auth_sessions_user ON auth.sessions(user_id);
CREATE INDEX idx_auth_sessions_expires ON auth.sessions(expires_at);
CREATE INDEX idx_auth_sessions_token_hash ON auth.sessions(refresh_token_hash);

-- Audit Log Table
CREATE TABLE IF NOT EXISTS auth.audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  action VARCHAR(50) NOT NULL,
  resource VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('success', 'failure'))
);

CREATE INDEX idx_audit_user ON auth.audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_action ON auth.audit_log(action, created_at DESC);
CREATE INDEX idx_audit_created ON auth.audit_log(created_at DESC);

-- Roles Table
CREATE TABLE IF NOT EXISTS auth.roles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_id CHECK (id ~ '^[a-z0-9_-]+$')
);

CREATE INDEX idx_roles_name ON auth.roles(name);

-- Permissions Table
CREATE TABLE IF NOT EXISTS auth.permissions (
  id VARCHAR(100) PRIMARY KEY,
  role_id VARCHAR(50) NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_resource_action CHECK (
    resource ~ '^[a-z0-9_:*]+$' AND 
    action ~ '^[a-z0-9_*]+$'
  ),
  UNIQUE(role_id, resource, action)
);

CREATE INDEX idx_permissions_role ON auth.permissions(role_id);

-- Revoked Tokens Table
CREATE TABLE IF NOT EXISTS auth.revoked_tokens (
  jti VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  revoked_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  
  CONSTRAINT valid_expiry CHECK (expires_at > revoked_at)
);

CREATE INDEX idx_revoked_tokens_expires ON auth.revoked_tokens(expires_at);
CREATE INDEX idx_revoked_tokens_user ON auth.revoked_tokens(user_id);

-- Insert default roles
INSERT INTO auth.roles (id, name, description) VALUES
  ('role-student', 'Estudiante', 'Rol para estudiantes de la institución'),
  ('role-teacher', 'Docente', 'Rol para docentes de la institución'),
  ('role-admin', 'Administrador', 'Rol para administradores del sistema')
ON CONFLICT (id) DO NOTHING;

-- Insert default permissions for student role
INSERT INTO auth.permissions (id, role_id, resource, action, description) VALUES
  ('perm-read-calendar', 'role-student', 'calendar', 'read', 'Lectura de calendario'),
  ('perm-write-reminders', 'role-student', 'reminders', 'write', 'Creación de recordatorios'),
  ('perm-read-profile', 'role-student', 'profile', 'read', 'Lectura de perfil propio'),
  ('perm-read-recommendations', 'role-student', 'recommendations', 'read', 'Lectura de recomendaciones')
ON CONFLICT (id) DO NOTHING;

-- Insert permissions for teacher role
INSERT INTO auth.permissions (id, role_id, resource, action, description) VALUES
  ('perm-read-grades', 'role-teacher', 'grades', 'read', 'Lectura de calificaciones'),
  ('perm-write-grades', 'role-teacher', 'grades', 'write', 'Escritura de calificaciones'),
  ('perm-read-students', 'role-teacher', 'students', 'read', 'Lectura de estudiantes'),
  ('perm-write-calendar', 'role-teacher', 'calendar', 'write', 'Escritura en calendario')
ON CONFLICT (id) DO NOTHING;

-- Insert permissions for admin role
INSERT INTO auth.permissions (id, role_id, resource, action, description) VALUES
  ('perm-admin-all', 'role-admin', '*', '*', 'Acceso total del administrador')
ON CONFLICT (id) DO NOTHING;

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION auth.cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM auth.sessions WHERE expires_at < NOW();
  DELETE FROM auth.revoked_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant privileges (adjust schema and user as needed)
GRANT USAGE ON SCHEMA auth TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO postgres;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA auth TO postgres;
