# Auth Service - Especificación Técnica Detallada

**Versión:** 1.0  
**Fecha:** Noviembre 11, 2025  
**Estado:** En Revisión  

---

## 1. Descripción General

El **Auth Service** es la puerta de entrada de seguridad para la plataforma AI Companion Unisalle. Gestiona:

- Autenticación OIDC (OpenID Connect) contra IdP institucional
- Emisión y validación de JWT tokens
- Refresh token flow
- Integración con WSO2 API Manager
- RBAC (Role-Based Access Control)

---

## 2. Requisitos Funcionales

### 2.1 Endpoints REST

#### POST /auth/token

Intercambia un código de autorización por tokens de acceso.

```http
POST /auth/token HTTP/1.1
Host: auth.unisalle.local
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=auth_code_from_idp&
client_id=unisalle_client&
client_secret=secret_key&
redirect_uri=https://app.unisalle.local/callback&
state=random_state_value
```

**Respuesta 200 OK:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "rt_1234567890abcdef",
  "scope": "openid profile email roles"
}
```

**Respuesta 400 Bad Request:**

```json
{
  "error": "invalid_grant",
  "error_description": "The provided authorization code is invalid or expired"
}
```

---

#### GET /auth/userinfo

Retorna información del usuario autenticado.

```http
GET /auth/userinfo HTTP/1.1
Host: auth.unisalle.local
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Respuesta 200 OK:**

```json
{
  "sub": "user-12345",
  "email": "estudiante@unisalle.edu.co",
  "email_verified": true,
  "name": "Juan Pérez",
  "given_name": "Juan",
  "family_name": "Pérez",
  "picture": "https://idp.unisalle.local/pictures/user-12345.jpg",
  "locale": "es-CO",
  "roles": [
    {
      "id": "role-student",
      "name": "Estudiante",
      "permissions": ["read:calendar", "write:reminders"]
    }
  ],
  "iat": 1699686000,
  "exp": 1699689600
}
```

**Respuesta 401 Unauthorized:**

```json
{
  "error": "invalid_token",
  "error_description": "The access token is invalid or expired"
}
```

---

#### POST /auth/refresh

Obtiene un nuevo access token usando el refresh token.

```http
POST /auth/refresh HTTP/1.1
Host: auth.unisalle.local
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&
refresh_token=rt_1234567890abcdef&
client_id=unisalle_client&
client_secret=secret_key
```

**Respuesta 200 OK:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "openid profile email roles"
}
```

---

#### POST /auth/logout

Invalida el refresh token y las sesiones del usuario.

```http
POST /auth/logout HTTP/1.1
Host: auth.unisalle.local
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "refresh_token": "rt_1234567890abcdef"
}
```

**Respuesta 204 No Content**

---

#### GET /auth/validate

Valida un token JWT sin hacer call al IdP.

```http
GET /auth/validate HTTP/1.1
Host: auth.unisalle.local
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Respuesta 200 OK:**

```json
{
  "valid": true,
  "payload": {
    "sub": "user-12345",
    "roles": ["student"],
    "iat": 1699686000,
    "exp": 1699689600
  }
}
```

---

## 3. Requisitos No-Funcionales

### 3.1 SLO (Service Level Objectives)

```
- Disponibilidad: 99.95% (< 22 minutos downtime/mes)
- P50 Latencia /token: 150ms
- P95 Latencia /token: 300ms
- P99 Latencia /token: 500ms
- Tasa error: < 0.1%
- Error rate /token (network): < 1%
```

### 3.2 Seguridad

- ✅ HTTPS/TLS 1.2+ obligatorio
- ✅ CORS policy restrictiva
- ✅ Rate limiting: 10 req/sec por IP
- ✅ JWT signing con RS256 (RSA)
- ✅ Secrets en AWS Secrets Manager / Vault
- ✅ SQL injection protection: Prepared statements
- ✅ CSRF tokens para POST
- ✅ Auditoria de todos los accesos

### 3.3 Conformidad

- ✅ OWASP Top 10 (2021)
- ✅ ISO/IEC 27001
- ✅ LGPD (Lei Geral de Proteção de Dados)
- ✅ RFC 6749 (OAuth 2.0)
- ✅ RFC 6750 (OAuth 2.0 Bearer Token)
- ✅ RFC 8252 (PKCE - OAuth 2.0)

---

## 4. Arquitectura Técnica

### 4.1 Stack Tecnológico

```
TypeScript 5.x
Express.js 5.x
Node.js 18+
PostgreSQL 15
Redis 7.x (caché de sesiones)
jsonwebtoken (JWT)
passport.js (OIDC strategy)
axios (HTTP client)
winston (logging)
OpenTelemetry (observabilidad)
Jest (testing)
Docker (containerización)
```

### 4.2 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│  Express.js Server                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Routes                                             │   │
│  │  ├─ POST /auth/token                               │   │
│  │  ├─ GET /auth/userinfo                             │   │
│  │  ├─ POST /auth/refresh                             │   │
│  │  ├─ POST /auth/logout                              │   │
│  │  └─ GET /auth/validate                             │   │
│  └────────┬────────────────────────────────────────────┘   │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Middleware                                         │   │
│  │  ├─ CORS                                            │   │
│  │  ├─ Rate Limiting                                  │   │
│  │  ├─ Error Handler                                  │   │
│  │  └─ Request Logger (OpenTelemetry)                │   │
│  └────────┬────────────────────────────────────────────┘   │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Controllers                                        │   │
│  │  ├─ AuthController                                 │   │
│  │  └─ TokenController                                │   │
│  └────────┬────────────────────────────────────────────┘   │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Services                                           │   │
│  │  ├─ AuthService (OIDC flow)                        │   │
│  │  ├─ TokenService (JWT generation)                  │   │
│  │  ├─ SessionService (Redis)                         │   │
│  │  └─ AuditService (logging)                         │   │
│  └────────┬────────────────────────────────────────────┘   │
│           │                                                  │
└───────────┼──────────────────────────────────────────────────┘
            │
            ├──────────────────┬──────────────┬─────────────┐
            │                  │              │             │
            ▼                  ▼              ▼             ▼
      ┌──────────┐      ┌──────────┐  ┌──────────┐  ┌──────────┐
      │ IdP      │      │PostgreSQL│  │   Redis  │  │ OpenTel  │
      │(OIDC)    │      │  (DB)    │  │(Sessions)│  │ (Traces) │
      └──────────┘      └──────────┘  └──────────┘  └──────────┘
```

### 4.3 Flujo OIDC Authorization Code

```
1. Cliente (/login):
   GET /auth/authorize?client_id=...&redirect_uri=...&state=...

2. Auth Service:
   Redirige a IdP: https://idp.unisalle.local/oauth/authorize

3. IdP (Okta/Azure AD):
   Usuario ingresa credenciales

4. IdP → Auth Service:
   GET /auth/callback?code=AUTH_CODE&state=STATE

5. Auth Service → IdP:
   POST /oauth/token (code exchange)

6. IdP → Auth Service:
   access_token, id_token, refresh_token

7. Auth Service:
   ├─ Valida ID token
   ├─ Extrae claims (sub, email, roles)
   ├─ Genera JWT propio (signed con RS256)
   ├─ Guarda refresh_token en Redis
   └─ Redirige a cliente

8. Cliente:
   Recibe JWT en cookie HttpOnly
   Sub: eyJhbGciOiJSUzI1NiJ9...
```

---

## 5. Esquema de Base de Datos

### 5.1 Tabla de Sesiones

```sql
CREATE TABLE auth_sessions (
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
  revoked_at TIMESTAMP
);

CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_expires ON auth_sessions(expires_at);
```

### 5.2 Tabla de Auditoria

```sql
CREATE TABLE auth_audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  action VARCHAR(50) NOT NULL,
  resource VARCHAR(255),
  status VARCHAR(20) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON auth_audit_log(user_id, created_at);
```

### 5.3 Tabla de Roles y Permisos

```sql
CREATE TABLE auth_roles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE auth_permissions (
  id VARCHAR(100) PRIMARY KEY,
  role_id VARCHAR(50) REFERENCES auth_roles(id),
  resource VARCHAR(100),
  action VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 6. Estructura de JWT Payload

```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "key-id-2024"
}
.
{
  "sub": "user-12345",
  "aud": ["api.unisalle.local"],
  "iss": "https://auth.unisalle.local",
  "iat": 1699686000,
  "exp": 1699689600,
  "email": "estudiante@unisalle.edu.co",
  "email_verified": true,
  "name": "Juan Pérez",
  "roles": ["student"],
  "permissions": ["read:calendar", "write:reminders"],
  "jti": "unique-token-id",
  "scope": "openid profile email roles"
}
.
SIGNATURE
```

---

## 7. Variables de Entorno

```bash
# OIDC Provider Configuration
OIDC_PROVIDER_URL=https://idp.unisalle.local
OIDC_CLIENT_ID=unisalle_client
OIDC_CLIENT_SECRET=****
OIDC_REDIRECT_URI=http://localhost:3001/auth/callback

# JWT Configuration
JWT_SECRET_KEY=****
JWT_ALGORITHM=RS256
JWT_PUBLIC_KEY_PATH=/etc/secrets/jwt.public.key
JWT_PRIVATE_KEY_PATH=/etc/secrets/jwt.private.key
JWT_EXPIRY_SECONDS=3600
JWT_REFRESH_EXPIRY_SECONDS=604800

# PostgreSQL
DATABASE_URL=postgresql://postgres:password@localhost:5432/auth_db

# Redis
REDIS_URL=redis://localhost:6379/0
REDIS_PASSWORD=

# Server
PORT=3001
NODE_ENV=development
LOG_LEVEL=info

# Security
CORS_ORIGIN=http://localhost:3000,https://app.unisalle.local
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=10

# OpenTelemetry
OTEL_SERVICE_NAME=auth-service
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

---

## 8. Casos de Prueba

### 8.1 Pruebas Unitarias (Jest)

```typescript
describe('AuthService', () => {
  describe('exchangeCodeForToken', () => {
    it('should exchange valid auth code for tokens', async () => {
      // Arrange
      const code = 'valid_auth_code';
      
      // Act
      const result = await authService.exchangeCodeForToken(code);
      
      // Assert
      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
      expect(result.expires_in).toBe(3600);
    });
    
    it('should throw error for invalid code', async () => {
      const code = 'invalid_code';
      
      await expect(
        authService.exchangeCodeForToken(code)
      ).rejects.toThrow('invalid_grant');
    });
  });
  
  describe('validateToken', () => {
    it('should validate valid JWT token', () => {
      const token = generateValidJWT();
      const result = authService.validateToken(token);
      
      expect(result.valid).toBe(true);
      expect(result.payload.sub).toBe('user-12345');
    });
    
    it('should reject expired token', () => {
      const token = generateExpiredJWT();
      const result = authService.validateToken(token);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });
  });
});
```

### 8.2 Pruebas de Integración

```typescript
describe('Auth API Integration', () => {
  let app;
  let request;

  beforeAll(async () => {
    app = await initializeApp();
    request = supertest(app);
  });

  describe('POST /auth/token', () => {
    it('should return tokens for valid code', async () => {
      const response = await request
        .post('/auth/token')
        .send({
          grant_type: 'authorization_code',
          code: 'valid_code',
          client_id: 'unisalle_client'
        });

      expect(response.status).toBe(200);
      expect(response.body.access_token).toBeDefined();
      expect(response.body.expires_in).toBe(3600);
    });

    it('should reject invalid credentials', async () => {
      const response = await request
        .post('/auth/token')
        .send({
          grant_type: 'authorization_code',
          code: 'invalid_code'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_grant');
    });
  });

  describe('GET /auth/userinfo', () => {
    it('should return user info with valid token', async () => {
      const token = generateValidJWT();
      
      const response = await request
        .get('/auth/userinfo')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.email).toBe('estudiante@unisalle.edu.co');
      expect(response.body.roles).toContain('student');
    });

    it('should reject request without token', async () => {
      const response = await request.get('/auth/userinfo');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('invalid_token');
    });
  });
});
```

---

## 9. Monitoreo y Alertas

### 9.1 Métricas Prometheus

```
# Emitidas por el servicio:

auth_token_issued_total
  labels: [client_id, grant_type, status]
  help: Número total de tokens emitidos

auth_token_validation_duration_ms
  labels: [result]
  help: Tiempo de validación de tokens (milisegundos)

auth_oidc_code_exchange_duration_ms
  help: Duración del intercambio de código OIDC

auth_sessions_active
  help: Número de sesiones activas

auth_authentication_failures_total
  labels: [reason]
  help: Total de fallos de autenticación

auth_rate_limit_exceeded_total
  labels: [ip]
  help: Total de requests rechazados por rate limit
```

### 9.2 Alertas Recomendadas

```yaml
- alert: AuthServiceHighErrorRate
  expr: rate(auth_authentication_failures_total[5m]) > 0.001
  for: 5m
  severity: warning

- alert: AuthServiceHighLatency
  expr: histogram_quantile(0.95, auth_token_validation_duration_ms) > 300
  for: 10m
  severity: warning

- alert: AuthServiceDown
  expr: up{job="auth-service"} == 0
  for: 1m
  severity: critical
```

---

## 10. Plan de Implementación

### Fase 1: Setup (1-2 días)

- [ ] Inicializar proyecto TypeScript
- [ ] Configurar Express.js y middleware base
- [ ] Setup PostgreSQL + Redis
- [ ] Configurar variables de entorno

### Fase 2: Core Auth (3-4 días)

- [ ] Implementar OIDC flow con passport.js
- [ ] JWT generation y validation
- [ ] Endpoints /token, /userinfo, /refresh
- [ ] Middleware de seguridad

### Fase 3: Seguridad y Auditoria (2-3 días)

- [ ] Rate limiting
- [ ] CORS configuration
- [ ] SQL injection / XSS protection
- [ ] Audit logging

### Fase 4: Testing y Docs (2-3 días)

- [ ] Unit tests (>80% coverage)
- [ ] Integration tests
- [ ] OpenAPI spec
- [ ] README y guía de instalación

### Fase 5: Observabilidad (1-2 días)

- [ ] OpenTelemetry instrumentation
- [ ] Prometheus metrics
- [ ] Grafana dashboard

---

## 11. Dependencias Externas

| Dependencia | Versión | Propósito |
|---|---|---|
| jsonwebtoken | ^9.1.0 | JWT signing/verification |
| passport | ^0.7.0 | OIDC authentication |
| passport-openidconnect | ^0.0.2 | OIDC strategy |
| express | ^5.x | Framework web |
| pg | ^8.x | PostgreSQL driver |
| redis | ^4.x | Caché y sesiones |
| axios | ^1.6.x | HTTP client |
| winston | ^3.x | Logging |
| opentelemetry/* | ^0.45.x | Observabilidad |

---

## 12. Criterios de Aceptación

```
✅ POST /auth/token funciona con código OIDC válido
✅ GET /auth/userinfo retorna info del usuario
✅ POST /auth/refresh genera nuevo access_token
✅ POST /auth/logout invalida la sesión
✅ P95 latencia < 300ms en /token
✅ Rate limiting funciona (10 req/sec)
✅ >80% cobertura de tests
✅ OpenAPI spec completa
✅ OpenTelemetry logs/traces en Jaeger
✅ Dockerfile multi-etapa
✅ Docker Compose integrado
```

---

**Este documento es la base para la implementación del Auth Service.**

