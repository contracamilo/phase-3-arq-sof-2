# 👨‍💻 Guía de Desarrollo Local

Guía completa para configurar y desarrollar localmente los servicios del proyecto.

## 🚀 Setup Inicial

### 1. Requisitos Previos

```bash
Node.js >= 18.0.0
npm >= 9.0.0
Docker Desktop
PostgreSQL 15+ (opcional, Docker provee)
```

### 2. Instalación

```bash
# Clonar repositorio
git clone https://github.com/contracamilo/phase-3-arq-sof-2.git
cd phase-3-arq-sof-2

# Instalar dependencias de todos los servicios
npm run install:all

# Crear archivo .env (copiar .env.example si existe)
cp .env.example .env
```

### 3. Configuración del Entorno

**Variables esenciales en `.env`:**

```bash
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres

# Auth Service
JWT_SECRET=your-secret-key
OIDC_ENABLED=false  # Cambiar a true si usas OIDC

# Firebase (si usas notificaciones)
GOOGLE_APPLICATION_CREDENTIALS=./soa-arch-soft-firebase-adminsdk-fbsvc-27fca782f6.json

# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317

# Logging
LOG_LEVEL=debug
```

## 🐳 Desarrollo con Docker

### Opción 1: Todos los Servicios en Docker

```bash
# Iniciar todos los servicios
npm run docker:up

# Ver logs de un servicio específico
npm run docker:logs -- auth-service

# Detener todos
npm run docker:down

# Limpiar volúmenes (borra base de datos)
npm run docker:clean
```

### Opción 2: Docker Infrastructure + Desarrollo Local

Útil si quieres desarrollar un servicio específico:

```bash
# Iniciar solo la infraestructura (PostgreSQL, RabbitMQ, Observability)
npm run docker:infra:up

# En otra terminal, desarrollar el servicio
cd services/auth-service
npm run dev

# Ver cambios en tiempo real (hot reload)
```

## 📝 Desarrollo por Servicio

### Reminder Service (Puerto 3000)

```bash
cd services/reminder-service

# Desarrollo con hot reload
npm run dev

# Build
npm run build

# Tests
npm run test

# Swagger UI
http://localhost:3000/api-docs
```

**Archivos importantes:**
- `src/app.ts` - Configuración Express
- `src/routes/reminder.routes.ts` - Endpoints
- `src/services/reminder.service.ts` - Lógica de negocio
- `src/repositories/reminder.repository.ts` - Acceso a datos

### Auth Service (Puerto 3001)

```bash
cd services/auth-service

# Desarrollo con hot reload
npm run dev

# Build
npm run build

# Tests
npm run test

# Swagger UI
http://localhost:3001/api-docs
```

**Archivos importantes:**
- `src/app.ts` - Configuración OAuth2/OIDC
- `src/routes/auth.routes.ts` - Endpoints de auth
- `src/middleware/` - Middleware de autenticación

### Notification Service (Puerto 3002)

```bash
cd services/notification-service

# Desarrollo
npm run dev

# Build
npm run build

# Tests
npm run test

# Health check
http://localhost:3002/health
```

**Archivos importantes:**
- `consumer.ts` - Consumidor de RabbitMQ
- `src/services/notification.service.ts` - Envío de notificaciones

## 🧪 Testing

### Tests Unitarios

```bash
# Todos los servicios
npm run test:all

# Un servicio específico
cd services/reminder-service
npm run test

# Con cobertura
npm run test:coverage
```

### Tests de Integración

```bash
# Requiere Docker corriendo
npm run test:integration
```

### Tests E2E

```bash
# Tests de flujo completo
npm run test:e2e
```

## 📊 Debugging

### Logs

```bash
# Ver logs de todos los servicios
npm run docker:logs

# Logs de un servicio (tiempo real)
docker logs -f reminder-service

# Logs con grep
docker logs auth-service | grep ERROR
```

### Debugger de Node.js

En VSCode, agregar a `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Auth Service Debug",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/services/auth-service/src/index.ts",
      "preLaunchTask": "npm: build:auth",
      "outFiles": ["${workspaceFolder}/services/auth-service/dist/**/*.js"]
    }
  ]
}
```

### Observabilidad en Desarrollo

```bash
# Jaeger UI (tracing)
http://localhost:16686

# Prometheus (métricas)
http://localhost:9090

# RabbitMQ Management
http://localhost:15672
# Usuario: guest
# Contraseña: guest
```

## 💾 Manejo de Base de Datos

### Inicializar Base de Datos

```bash
# Crear bases de datos y schemas
npm run db:init

# Ver estado actual
npm run db:status
```

### Migraciones

```bash
# Ver migraciones aplicadas
npm run db:migrate:status

# Aplicar migraciones
npm run db:migrate:up

# Revertir última migración
npm run db:migrate:down
```

### Resetear Base de Datos

```bash
# ⚠️ DESTRUYE DATOS
npm run db:reset

# O manualmente
docker exec postgres psql -U postgres -d reminder_db -f ./init.sql
```

## 🔄 Git Workflow

### Ramas de Desarrollo

```bash
# Crear rama de feature
git checkout -b feat/tu-feature

# Crear rama de bugfix
git checkout -b fix/tu-bugfix

# Checkout a rama existente
git checkout feat/auth-service
```

### Commits

```bash
# Ver cambios
git status
git diff

# Agregar cambios
git add .

# Commit con mensaje descriptivo
git commit -m "feat(auth): add OAuth2 support"

# Push a rama
git push origin feat/auth-service
```

### Pull Requests

1. Push tu rama: `git push origin feat/tu-feature`
2. Abre PR en GitHub
3. Espera review
4. Merge a `main`

## 📦 Scripts Disponibles

En root del proyecto:

```bash
npm run install:all          # Instalar deps de todos los servicios
npm run build:all            # Build de todos los servicios
npm run dev:reminder         # Dev mode reminder service
npm run dev:auth             # Dev mode auth service
npm run dev:notification     # Dev mode notification service
npm run test:all             # Tests de todos
npm run docker:up            # Docker compose up
npm run docker:down          # Docker compose down
npm run docker:logs          # Ver logs Docker
npm run docker:clean         # Limpiar volúmenes
npm run db:init              # Inicializar BD
```

## 🐛 Troubleshooting Común

### Error: "Port 3000 already in use"

```bash
# Encontrar proceso usando puerto
lsof -i :3000

# Matar proceso
kill -9 <PID>

# O cambiar puerto en .env
PORT=3001
```

### Error: "Could not connect to PostgreSQL"

```bash
# Verificar Docker está corriendo
docker ps

# Verificar PostgreSQL está activo
docker exec postgres psql -U postgres -l

# Reiniciar
npm run docker:down
npm run docker:up
```

### Error: "RabbitMQ connection refused"

```bash
# Verificar RabbitMQ en Docker
docker ps | grep rabbitmq

# Verificar logs
docker logs rabbitmq

# Reiniciar
docker restart rabbitmq
```

### TypeScript compile errors

```bash
# Limpiar build anterior
npm run clean

# Reinstalar dependencias
npm install

# Rebuild
npm run build
```

## ✨ Tips para Desarrollo

1. **Hot Reload:** Usa `npm run dev` para cambios en tiempo real
2. **Logs:** Cambia `LOG_LEVEL=debug` en .env para más detalles
3. **Swagger UI:** Útil para probar endpoints: http://localhost:3000/api-docs
4. **Postman:** Importa colecciones de cada servicio para testing
5. **Git Hooks:** Considera agregar pre-commit hooks con linters
6. **Environment:** Copia .env.example a .env y personaliza

## 🚀 Deployment Desde Desarrollo

Ver [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) para llevar a producción.

---

**Actualizado:** 11 Nov 2025
**Versión:** 1.0.0
