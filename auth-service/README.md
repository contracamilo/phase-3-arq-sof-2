# Auth Service - Autenticación y SSO

**Versión:** 1.0.0  
**Estado:** En Desarrollo  
**Última Actualización:** Noviembre 11, 2025  

## 📋 Descripción

El **Auth Service** es el servicio de autenticación centralizado para **AI Companion Unisalle**. Gestiona:

- 🔐 **Autenticación OIDC** contra proveedores de identidad institucionales (Okta, Azure AD, Keycloak)
- 🎫 **Emisión de JWT tokens** con firma RS256
- 🔄 **Refresh token flow** para renovación sin re-autenticación
- 👤 **User info endpoint** compatible con OpenID Connect
- 🛡️ **RBAC (Role-Based Access Control)** integrado
- 📊 **Auditoría de accesos** y eventos de seguridad
- 📈 **OpenTelemetry instrumentation** para observabilidad

---

## 🚀 Inicio Rápido

### Requisitos Previos

```bash
Node.js >= 18.0.0
npm >= 9.0.0
PostgreSQL >= 15
Docker & Docker Compose (opcional)
```

### Instalación Local

#### 1. Clonar y configurar

```bash
cd auth-service
npm install
cp .env.example .env
```

#### 2. Configurar variables de entorno

Editar `.env` con los valores de tu IdP:

```bash
OIDC_PROVIDER_URL=https://tu-idp.example.com
OIDC_CLIENT_ID=unisalle_client
OIDC_CLIENT_SECRET=tu_secreto_aqui
OIDC_REDIRECT_URI=http://localhost:3001/auth/callback

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/auth_db
REDIS_URL=redis://localhost:6379
```

#### 3. Inicializar base de datos

```bash
# Si PostgreSQL está corriendo localmente
psql -U postgres -f init.sql

# O usando docker-compose (ver sección Docker abajo)
docker-compose up postgres -d
docker-compose exec postgres psql -U postgres -f /docker-entrypoint-initdb.d/init.sql
```

#### 4. Ejecutar en desarrollo

```bash
npm run dev
```

El servicio estará disponible en `http://localhost:3001`

---

## 🐳 Despliegue con Docker

### Opción 1: Docker Compose (Recomendado)

```bash
docker-compose up auth-service postgres redis
```

### Opción 2: Docker standalone

```bash
# Construir imagen
docker build -t auth-service:1.0.0 .

# Ejecutar contenedor
docker run -p 3001:3001 \
  -e DATABASE_URL="postgresql://postgres:postgres@postgres:5432/auth_db" \
  -e OIDC_PROVIDER_URL="https://idp.example.com" \
  -e OIDC_CLIENT_ID="unisalle_client" \
  -e OIDC_CLIENT_SECRET="secret" \
  auth-service:1.0.0
```

---

## 📡 Endpoints de API

### POST /auth/token

Intercambia un código de autorización por tokens JWT.

```bash
curl -X POST http://localhost:3001/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=AUTH_CODE&client_id=unisalle_client"
```

**Respuesta 200:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "rt_1234567890...",
  "scope": "openid profile email roles"
}
```

### GET /auth/userinfo

Obtiene información del usuario autenticado.

```bash
curl -X GET http://localhost:3001/auth/userinfo \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

**Respuesta 200:**

```json
{
  "sub": "user-12345",
  "email": "estudiante@unisalle.edu.co",
  "email_verified": true,
  "name": "Juan Pérez",
  "roles": [
    {
      "id": "role-student",
      "name": "Estudiante",
      "permissions": ["read:calendar", "write:reminders"]
    }
  ],
  "permissions": ["read:calendar", "write:reminders"],
  "iat": 1699686000,
  "exp": 1699689600
}
```

### POST /auth/refresh

Renueva un access token usando refresh token.

```bash
curl -X POST http://localhost:3001/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token&refresh_token=rt_1234567890..."
```

### POST /auth/validate

Valida un JWT token.

```bash
curl -X POST http://localhost:3001/auth/validate \
  -H "Content-Type: application/json" \
  -d '{"token":"eyJhbGciOiJIUzI1NiJ9..."}'
```

### POST /auth/logout

Cierra la sesión e invalida el refresh token.

```bash
curl -X POST http://localhost:3001/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

### GET /health

Health check endpoint.

```bash
curl http://localhost:3001/health
```

**Respuesta:**

```json
{
  "status": "ok",
  "service": "auth-service",
  "timestamp": "2025-11-11T10:30:00.000Z"
}
```

---

## 🧪 Testing

### Pruebas Unitarias

```bash
npm run test:unit
```

### Pruebas de Integración

```bash
npm run test:integration
```

### Todos los tests con cobertura

```bash
npm run test
```

Objetivo: **> 80% cobertura**

---

## 📊 Estructura de Proyecto

```
auth-service/
├── src/
│   ├── app.ts                      # Configuración Express
│   ├── index.ts                    # Punto de entrada
│   ├── config/
│   │   └── database.ts             # Configuración PostgreSQL
│   ├── controllers/                # Lógica de endpoints (futuro)
│   ├── models/
│   │   └── auth.model.ts           # Tipos y interfaces
│   ├── routes/
│   │   └── auth.routes.ts          # Definición de rutas
│   ├── services/
│   │   ├── oidc.service.ts         # Integración OIDC
│   │   └── token.service.ts        # Generación de JWT
│   ├── instrumentation/
│   │   └── opentelemetry.ts        # Configuración observabilidad
│   ├── middleware/                 # Middleware personalizado (futuro)
│   ├── utils/                      # Funciones auxiliares
│   └── __tests__/
│       ├── unit/
│       └── integration/
├── init.sql                        # Script inicialización BD
├── Dockerfile                      # Imagen Docker multi-etapa
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## 🔐 Seguridad

### Mejores Prácticas Implementadas

✅ **HTTPS/TLS obligatorio** en producción  
✅ **CORS policy restrictiva** por dominio  
✅ **Rate limiting** (100 req/min por IP)  
✅ **JWT firmados con RS256** (RSA)  
✅ **Secrets en variables de entorno**  
✅ **SQL injection prevention** (prepared statements)  
✅ **OWASP Top 10 (2021)** compliance  
✅ **Auditoria completa** de accesos  

### Protección de Secrets

```bash
# Nunca commitear .env con valores reales
# Usar AWS Secrets Manager, HashiCorp Vault, o similar en producción

# En desarrollo local:
cp .env.example .env
# Editar .env con valores de desarrollo
# .env está en .gitignore
```

---

## 📈 Observabilidad

### OpenTelemetry Metrics

El servicio exporta automáticamente:

- **Trazas (Traces)** distribuidas vía OTLP
- **Métricas (Metrics)** de performance
- **Logs estructurados** en JSON

### Jaeger Tracing

Ver trazas en `http://localhost:16686`

### Prometheus Metrics

Metricas en `http://localhost:9090`

---

## 🔧 Configuración

### Variables de Entorno Principales

| Variable | Descripción | Por Defecto |
|----------|-------------|-------------|
| `PORT` | Puerto del servicio | `3001` |
| `NODE_ENV` | Ambiente (development/production) | `development` |
| `LOG_LEVEL` | Nivel de logging | `info` |
| `OIDC_PROVIDER_URL` | URL del IdP | Requerido |
| `OIDC_CLIENT_ID` | ID del cliente OIDC | Requerido |
| `OIDC_CLIENT_SECRET` | Secret del cliente OIDC | Requerido |
| `JWT_EXPIRY_SECONDS` | Validez del JWT | `3600` (1 hora) |
| `JWT_REFRESH_EXPIRY_SECONDS` | Validez del refresh token | `604800` (7 días) |
| `DATABASE_URL` | Conexión PostgreSQL | Requerido |
| `REDIS_URL` | Conexión Redis | `redis://localhost:6379` |
| `CORS_ORIGIN` | Orígenes CORS permitidos | `http://localhost:3000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests por ventana | `100` |
| `OTEL_ENABLED` | Habilitar OpenTelemetry | `true` |

---

## 📋 Checklist de Producción

Antes de desplegar a producción:

- [ ] Configurar OIDC provider (Okta/Azure AD)
- [ ] Validar endpoint de IdP
- [ ] Configurar JWT secrets con RSA keys
- [ ] Habilitar HTTPS/TLS
- [ ] Configurar CORS para dominios reales
- [ ] Aumentar rate limits si es necesario
- [ ] Configurar backups de PostgreSQL
- [ ] Habilitar auditoria y logging
- [ ] Pruebas de carga/stress
- [ ] Configurar alertas en Prometheus
- [ ] Documentación de runbooks
- [ ] Plan de disaster recovery

---

## 🐛 Troubleshooting

### Error: "Cannot connect to database"

```bash
# Verificar conexión PostgreSQL
psql $DATABASE_URL -c "SELECT 1"

# Verificar que init.sql fue ejecutado
psql $DATABASE_URL -c "\dt auth.*"
```

### Error: "OIDC provider unreachable"

```bash
# Probar conectividad al IdP
curl -I $OIDC_PROVIDER_URL/.well-known/openid-configuration

# Verificar secrets y URLs en .env
echo "OIDC_PROVIDER_URL: $OIDC_PROVIDER_URL"
echo "OIDC_CLIENT_ID: $OIDC_CLIENT_ID"
```

### Logs no aparecer

```bash
# Verificar nivel de logging
LOG_LEVEL=debug npm run dev

# Ver logs de Docker
docker logs auth-service-container
```

---

## 📚 Documentación Adicional

- [Especificación Técnica Detallada](../docs/AUTH_SERVICE_SPEC.md)
- [Plan de Implementación Fase 3](../docs/PHASE3_IMPLEMENTATION_PLAN.md)
- [RFC 6749 - OAuth 2.0 Authorization Framework](https://tools.ietf.org/html/rfc6749)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [JWT Handbook](https://auth0.com/resources/ebooks/jwt-handbook)

---

## 🤝 Contribuir

Para contribuir al Auth Service:

1. Crear branch feature: `git checkout -b feature/mi-feature`
2. Commit cambios: `git commit -am 'Add feature'`
3. Push: `git push origin feature/mi-feature`
4. Pull request con descripción detallada
5. Asegurar tests pasen: `npm test`
6. Cobertura > 80%

---

## 📄 Licencia

MIT © Universidad Unisalle 2025

---

**Última revisión:** 11 de Noviembre de 2025  
**Responsable:** Equipo de Arquitectura de Software  

