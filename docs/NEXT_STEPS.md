# ✅ CHECKLIST DE PRÓXIMAS ACCIONES

**Documento:** Pasos inmediatos para continuar implementación  
**Actualizado:** 11 Noviembre 2025

---

## 🎯 Prioridades Esta Semana (11-17 Noviembre)

### DEBE Completarse (Bloqueador para Profile Service)

#### [ ] 1. Pruebas Unitarias para Auth Service (1-2 días)

**Ubicación:** `auth-service/src/__tests__/unit/`

```
Archivos a crear:
- token.service.test.ts (TokenService)
  └─ generateAccessToken()
  └─ validateToken()
  └─ isTokenExpired()
  └─ hashRefreshToken()
  └─ decodeToken()
  
- oidc.service.test.ts (OIDCService)
  └─ exchangeCodeForToken()
  └─ refreshAccessToken()
  └─ getUserInfo()
  └─ mapRoles()
  └─ mapPermissions()
```

**Herramienta:** Jest + TypeScript  
**Target:** >80% cobertura  
**Comando:** `npm test:unit`

---

#### [ ] 2. Pruebas de Integración (1-2 días)

**Ubicación:** `auth-service/src/__tests__/integration/`

```
Archivos a crear:
- api.test.ts (Endpoints E2E)
  └─ POST /auth/token (authorization_code)
  └─ GET /auth/userinfo
  └─ POST /auth/refresh
  └─ POST /auth/validate
  └─ POST /auth/logout
  └─ Error cases (invalid code, expired token, etc.)
```

**Setup:** Testcontainers + PostgreSQL  
**Target:** >80% cobertura  
**Comando:** `npm test:integration`

---

#### [ ] 3. SessionService - Guardar Refresh Tokens

**Ubicación:** `auth-service/src/services/session.service.ts`

```typescript
// Métodos a implementar:
- saveRefreshToken(userId, tokenHash, expiresAt): Promise<void>
- validateRefreshToken(tokenHash): Promise<boolean>
- revokeRefreshToken(tokenHash): Promise<void>
- getUserSessions(userId): Promise<AuthSession[]>
- cleanupExpiredSessions(): Promise<number>

// Usar:
- PostgreSQL auth.sessions table
- Redis para caché de sesiones activas
- TTL automático en Redis
```

---

#### [ ] 4. AuditService - Logging de Accesos

**Ubicación:** `auth-service/src/services/audit.service.ts`

```typescript
// Métodos a implementar:
- logLoginSuccess(userId, ipAddress, userAgent): Promise<void>
- logLoginFailure(reason, ipAddress): Promise<void>
- logTokenValidation(userId, result): Promise<void>
- logTokenRefresh(userId): Promise<void>
- logLogout(userId): Promise<void>
- getAuditLog(userId, limit): Promise<AuditLogEntry[]>

// Usar:
- PostgreSQL auth.audit_log table
- Winston logger para eventos
- ELK stack ready (no implementar ahora)
```

---

#### [ ] 5. Validaciones Adicionales en Middleware

**Ubicación:** `auth-service/src/middleware/validation.middleware.ts`

```typescript
// Implementar:
- Input validation (código, refresh_token length/format)
- CORS origin validation
- Content-Type validation
- Request size limits
- SQL injection prevention (ya con prepared statements)

// Usar: 
- express-validator library
- Helmet middleware para seguridad
```

---

#### [ ] 6. Integración en docker-compose.yml

**Ubicación:** `docker-compose.yml` (raíz del proyecto)

```yaml
services:
  auth-service:
    build:
      context: ./auth-service
      dockerfile: Dockerfile
    container_name: auth-service
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/auth_db
      OIDC_PROVIDER_URL: ${OIDC_PROVIDER_URL}
      OIDC_CLIENT_ID: ${OIDC_CLIENT_ID}
      OIDC_CLIENT_SECRET: ${OIDC_CLIENT_SECRET}
      # ... más variables
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - unisalle-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

**Verificar:**
- [ ] Servicios levantarse sin errores
- [ ] Health checks pasen
- [ ] Logs sean visibles

---

#### [ ] 7. OpenAPI Spec YAML

**Ubicación:** `auth-service/openapi.yaml`

```yaml
openapi: 3.0.0
info:
  title: Auth Service API
  version: 1.0.0
  description: OIDC-based authentication and token management
  
servers:
  - url: http://localhost:3001
    description: Local development

paths:
  /auth/token:
    post:
      summary: Exchange code for tokens
      requestBody:
        required: true
        content:
          application/x-www-form-urlencoded:
            schema:
              type: object
              properties:
                grant_type:
                  type: string
                  enum: [authorization_code, refresh_token]
                code:
                  type: string
                # ... más propiedades
      responses:
        '200':
          description: Token issued
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TokenResponse'
        # ... más respuestas

  # ... otros endpoints

components:
  schemas:
    TokenResponse:
      type: object
      properties:
        access_token:
          type: string
        token_type:
          type: string
        expires_in:
          type: integer
        refresh_token:
          type: string
```

**Usar:** Swagger UI integrado en endpoint `/docs`

---

### DEBERÍA Completarse (Próximas 2 semanas)

#### [ ] 8. Profile Service - Inicializar

**Copia estructura de `auth-service/` a `profile-service/`**

```bash
cp -r auth-service profile-service

# Cambios necesarios:
# 1. Cambiar puerto: 3001 → 3002
# 2. Cambiar nombre servicios: AuthService → ProfileService
# 3. Cambiar base de datos: auth_db → profile_db
# 4. Crear schema para perfiles
# 5. Implementar endpoints:
#    - GET /profile (userinfo + extended)
#    - PATCH /profile (update)
#    - GET /profile/roles
#    - GET /profile/preferences
```

**Timeline:** 1-2 semanas

---

## 🔍 Verificación Post-Completación

### Testing Coverage

```bash
# Ejecutar en auth-service/:

npm test                  # Todos los tests
npm run test:unit        # Solo unit tests (target >80%)
npm run test:integration # Solo integration (target >80%)

# Esperar cobertura report:
# ✅ Statements: >80%
# ✅ Branches: >75%
# ✅ Functions: >80%
# ✅ Lines: >80%
```

### Docker Validation

```bash
# Desde raíz del proyecto:
docker-compose up

# Verificar health checks:
curl http://localhost:3001/health
curl http://localhost:3001/ready

# Verificar BD inicializada:
docker-compose exec postgres psql -U postgres -d auth_db -c "SELECT COUNT(*) FROM auth.roles;"
```

### Lint and Format

```bash
# En auth-service/:
npm run lint       # Buscar errores
npm run format     # Formatar código

# Debe terminar sin errores
```

---

## 📋 Archivos a Crear/Modificar

### Auth Service (2-3 días)

```
CREATE:
✅ auth-service/src/__tests__/unit/token.service.test.ts
✅ auth-service/src/__tests__/unit/oidc.service.test.ts
✅ auth-service/src/__tests__/integration/api.test.ts
✅ auth-service/src/services/session.service.ts
✅ auth-service/src/services/audit.service.ts
✅ auth-service/src/middleware/validation.middleware.ts
✅ auth-service/openapi.yaml

MODIFY:
✅ auth-service/src/routes/auth.routes.ts (usar services)
✅ auth-service/src/app.ts (agregar new middleware)
✅ docker-compose.yml (agregar auth-service)
✅ .gitignore (ya debe tener node_modules, .env, dist)
```

### Profile Service (1 semana)

```
COPY:
✅ auth-service/ → profile-service/

CREATE:
✅ profile-service/src/models/profile.model.ts
✅ profile-service/src/services/profile.service.ts
✅ profile-service/src/routes/profile.routes.ts
✅ profile-service/src/__tests__/...
✅ profile-service/openapi.yaml

MODIFY:
✅ docker-compose.yml (agregar profile-service)
```

---

## 🚀 Comando Rápido para Empezar

```bash
cd auth-service

# 1. Instalar dependencias
npm install

# 2. Copiar .env
cp .env.example .env

# 3. Editar .env con credenciales reales (si tienes IdP disponible)
# Para desarrollo, puedes usar valores mock

# 4. Ejecutar tests (fallarán - es normal)
npm test

# 5. Empezar a implementar los casos de prueba
# Ver auth-service/src/__tests__/unit/ como template
```

---

## ⚠️ Bloqueadores Conocidos

### 1. OIDC Provider
**Solución:** Usar Keycloak en Docker como mock

```bash
docker run -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest \
  start-dev
```

### 2. Redis Connection
**Solución:** Usar en-memory mock para tests

```typescript
// En tests, usar:
import { createClient } from 'redis-mock';
// o
jest.mock('redis', () => ({
  createClient: () => ({
    get: jest.fn(),
    set: jest.fn(),
    // ...
  })
}));
```

### 3. PostgreSQL en Tests
**Solución:** Usar testcontainers

```bash
npm install --save-dev @testcontainers/postgresql

// En tests:
const postgres = await new PostgreSQLContainer().start();
const connectionString = postgres.getConnectionUri();
```

---

## 📞 Referencia Rápida

### Documentos Principales
- Plan maestro: `docs/PHASE3_IMPLEMENTATION_PLAN.md`
- Auth spec: `docs/AUTH_SERVICE_SPEC.md`
- Estado: `docs/PROGRESS_REPORT.md`
- Guía: `auth-service/README.md`

### Comandos Útiles
```bash
npm run dev            # Desarrollo con reload
npm run build          # Compilar TypeScript
npm run lint           # Verificar código
npm test               # Todos los tests
docker-compose up      # Levantar servicios
docker logs [service]  # Ver logs
```

### Puertos
- Auth Service: 3001
- Profile Service: 3002 (próximo)
- Calendar Service: 3003 (próximo)
- PostgreSQL: 5432
- Redis: 6379
- Jaeger: 16686
- Prometheus: 9090

---

## ✨ Éxito = Cuando...

```
✅ npm test              → Todos pasan, >80% coverage
✅ docker-compose up    → Servicios levantan sin errores
✅ curl /health         → Retorna 200 OK
✅ curl /auth/token     → Responde con estructura correcta (o 400 si falta code)
✅ npm run lint         → Sin errores
```

---

**Última actualización:** 11 Noviembre 2025  
**Responsable:** Equipo Arquitectura Software  
**Próxima review:** 18 Noviembre 2025  

