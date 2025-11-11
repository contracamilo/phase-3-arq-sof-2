# 🗄️ Guía de Base de Datos

Esquema, migraciones y gestión de datos para PostgreSQL.

## 📊 Arquitectura de Datos

```
PostgreSQL (1 servidor, 3 bases de datos)
├── reminder_db
│   ├── reminders (tabla principal)
│   ├── users (usuarios del sistema)
│   └── audit_logs (auditoría)
├── auth_db
│   ├── users (credenciales)
│   ├── tokens (tokens activos)
│   └── oauth_sessions (sesiones OAuth)
└── notification_db
    ├── notifications (historial)
    └── subscriptions (suscriptores)
```

## 🔌 Conexión

### Variables de Entorno

```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false  # true en producción
```

### Conexión Manual (psql)

```bash
# Conectar a reminder_db
docker exec postgres psql -U postgres -d reminder_db

# Ver tablas
\dt

# Ver estructura de tabla
\d reminders

# Ver conexiones activas
SELECT datname, usename, count(*) 
FROM pg_stat_activity 
GROUP BY datname, usename;
```

## 🏗️ Esquema de Reminders

### Tabla: reminders

```sql
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id VARCHAR(255) NOT NULL,
  completed BOOLEAN DEFAULT false,
  priority VARCHAR(50) DEFAULT 'MEDIUM'
);

-- Índices
CREATE INDEX idx_reminders_user_id ON reminders(user_id);
CREATE INDEX idx_reminders_due_date ON reminders(due_date);
CREATE INDEX idx_reminders_completed ON reminders(completed);
```

### Tabla: users

```sql
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);
```

### Tabla: audit_logs

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id VARCHAR(255),
  changes JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔐 Esquema de Auth

### Tabla: users

```sql
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);
```

### Tabla: tokens

```sql
CREATE TABLE tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  token VARCHAR(1000) NOT NULL,
  type VARCHAR(50), -- 'ACCESS', 'REFRESH'
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Limpiar tokens expirados automáticamente
CREATE INDEX idx_tokens_expires_at ON tokens(expires_at);
```

### Tabla: oauth_sessions

```sql
CREATE TABLE oauth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  provider VARCHAR(100) NOT NULL, -- 'google', 'microsoft', etc
  provider_user_id VARCHAR(255),
  access_token VARCHAR(2000),
  refresh_token VARCHAR(2000),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_oauth_sessions_user_id ON oauth_sessions(user_id);
CREATE INDEX idx_oauth_sessions_provider ON oauth_sessions(provider);
```

## 📬 Esquema de Notifications

### Tabla: notifications

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(100), -- 'EMAIL', 'SMS', 'PUSH'
  status VARCHAR(50) DEFAULT 'PENDING', -- 'SENT', 'FAILED', 'PENDING'
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  error_message TEXT
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
```

### Tabla: subscriptions

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  endpoint VARCHAR(1000) NOT NULL, -- push notification endpoint
  auth_secret VARCHAR(255),
  p256dh VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, endpoint)
);
```

## 📝 Migraciones

### Crear Migración

```bash
# Crear archivo de migración
touch migrations/001_initial_schema.sql

# Editar con SQL
cat > migrations/001_initial_schema.sql << 'EOF'
-- CreateTable reminders
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id VARCHAR(255) NOT NULL,
  completed BOOLEAN DEFAULT false,
  priority VARCHAR(50) DEFAULT 'MEDIUM'
);
EOF
```

### Aplicar Migraciones

```bash
# Ver migraciones pendientes
npm run db:migrate:status

# Aplicar todas
npm run db:migrate:up

# Aplicar una específica
npm run db:migrate:up -- --step=1

# Revertir última
npm run db:migrate:down

# Revertir todas
npm run db:migrate:reset
```

## 🔄 Operaciones Comunes

### Insertar Datos de Prueba

```bash
# Conectar a DB
docker exec postgres psql -U postgres -d reminder_db << 'EOF'

-- Insertar usuario
INSERT INTO users (id, email, first_name, last_name)
VALUES ('user1', 'john@example.com', 'John', 'Doe');

-- Insertar reminder
INSERT INTO reminders (title, description, due_date, user_id, priority)
VALUES (
  'Buy groceries',
  'Milk, eggs, bread',
  NOW() + INTERVAL '3 days',
  'user1',
  'HIGH'
);

-- Verificar
SELECT * FROM reminders;

EOF
```

### Exportar Datos

```bash
# Backup completo
docker exec postgres pg_dump -U postgres reminder_db > backup.sql

# Backup específica tabla
docker exec postgres pg_dump -U postgres -t reminders reminder_db > reminders.sql

# Con datos solo
docker exec postgres pg_dump -U postgres -a reminder_db > data.sql
```

### Restaurar Datos

```bash
# Restaurar desde backup
docker exec postgres psql -U postgres reminder_db < backup.sql

# Restaurar tabla específica
docker exec postgres psql -U postgres reminder_db < reminders.sql
```

## 🧹 Mantenimiento

### Limpiar Datos Antiguos

```bash
# Eliminar reminders completados hace > 30 días
docker exec postgres psql -U postgres -d reminder_db << 'EOF'
DELETE FROM reminders 
WHERE completed = true 
AND updated_at < NOW() - INTERVAL '30 days';
EOF
```

### Limpiar Tokens Expirados

```bash
# Eliminar tokens expirados
docker exec postgres psql -U postgres -d auth_db << 'EOF'
DELETE FROM tokens 
WHERE expires_at < NOW();

DELETE FROM oauth_sessions 
WHERE expires_at < NOW();
EOF
```

### Verificar Integridad

```bash
# Búsqueda de foreign key violations
docker exec postgres psql -U postgres -d reminder_db << 'EOF'
SELECT *
FROM reminders r
LEFT JOIN users u ON r.user_id = u.id
WHERE u.id IS NULL;
EOF
```

### Análisis de Performance

```bash
# Ver tablas más grandes
docker exec postgres psql -U postgres << 'EOF'
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
EOF
```

### VACUUM y ANALYZE

```bash
# Optimizar indices
docker exec postgres psql -U postgres -d reminder_db << 'EOF'
VACUUM ANALYZE;
EOF

# O por tabla
docker exec postgres psql -U postgres -d reminder_db << 'EOF'
VACUUM ANALYZE reminders;
EOF
```

## 🔒 Seguridad

### Cambiar Contraseña

```bash
# En producción, cambiar contraseña de postgres
docker exec postgres psql -U postgres << 'EOF'
ALTER USER postgres WITH PASSWORD 'new-secure-password';
EOF
```

### Roles y Permisos

```bash
# Crear usuario con permisos limitados
docker exec postgres psql -U postgres << 'EOF'

-- Crear usuario
CREATE USER reminder_app WITH PASSWORD 'app-password';

-- Dar permisos a BD
GRANT CONNECT ON DATABASE reminder_db TO reminder_app;
GRANT USAGE ON SCHEMA public TO reminder_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO reminder_app;

EOF
```

## 🆘 Troubleshooting

### Connection Pool Exhausted

```bash
# Ver conexiones activas
docker exec postgres psql -U postgres << 'EOF'
SELECT datname, count(*) 
FROM pg_stat_activity 
GROUP BY datname;
EOF

# Aumentar max_connections
docker exec postgres psql -U postgres << 'EOF'
ALTER SYSTEM SET max_connections = 200;
EOF

# Reiniciar
docker restart postgres
```

### Corrupted Index

```bash
# Recrear índices
docker exec postgres psql -U postgres -d reminder_db << 'EOF'
REINDEX INDEX idx_reminders_user_id;
REINDEX TABLE reminders;
EOF
```

### Deadlocks

```bash
# Ver deadlocks
docker exec postgres psql -U postgres << 'EOF'
SELECT * FROM pg_stat_activity WHERE state = 'active';
EOF

# Matar query larga
SELECT pg_terminate_backend(pid);
```

## 📚 Recursos

- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Query Tuning](https://www.postgresql.org/docs/current/sql-explain.html)
- [Connection Pooling](https://pgbouncer.github.io/)

---

**Actualizado:** 11 Nov 2025
**Versión:** 1.0.0
