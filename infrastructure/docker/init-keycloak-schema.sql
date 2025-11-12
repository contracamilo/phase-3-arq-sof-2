-- Keycloak Schema Initialization
-- PostgreSQL 15+ compatible

-- Create keycloak schema for Keycloak database
CREATE SCHEMA IF NOT EXISTS keycloak;

-- Grant permissions to postgres user
GRANT ALL ON SCHEMA keycloak TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA keycloak TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA keycloak TO postgres;

-- Allow future tables to be created with proper permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA keycloak GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA keycloak GRANT ALL ON SEQUENCES TO postgres;