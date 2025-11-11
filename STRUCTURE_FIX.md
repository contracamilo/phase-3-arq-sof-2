# 🔧 Actualización de Estructura SOA

**Fecha:** 11 Noviembre 2025  
**Estado:** Plan de Acción

---

## 📊 Análisis de Problemas Actuales

### Conflictos de Estructura Identificados

```
❌ PROBLEMA 1: Duplicidad de código
   ├── /src/                        (antigua estructura)
   │   ├── app.ts
   │   ├── index.ts
   │   ├── models/
   │   └── services/
   │
   └── /services/reminder-service/  (nueva estructura)
       ├── app.ts
       ├── index.ts
       ├── models/
       └── services/

❌ PROBLEMA 2: auth-service tiene estructura diferente
   ├── /auth-service/              (viejo)
   │   └── src/
   │       ├── models/
   │       ├── services/
   │       └── routes/
   │
   └── /services/auth-service/    (esperado)
       ├── models/
       ├── services/
       └── routes/

❌ PROBLEMA 3: package.json raíz apunta a /src/
   └── "main": "dist/index.js"    (debería ser servicios individuales)

❌ PROBLEMA 4: Rutas de importación incorrectas
   └── import from '../config'   (cuando debería ser './config')
```

---

## ✅ Plan de Acción

### Fase 1: Limpiar duplicados (30 min)

```bash
# 1. Mover estructura correcta a /services/reminder-service/
   # Ya está en lugar correcto, solo consolidar

# 2. Eliminar carpeta /src/ antigua
   # rm -rf src/

# 3. Eliminar /auth-service/ antigua
   # rm -rf auth-service/
```

### Fase 2: Actualizar package.json (15 min)

**Cambiar en root package.json:**
- Remover scripts que apuntan a /src/
- Agregar scripts workspace para servicios
- Usar monorepo o scripts coordinados

### Fase 3: Actualizar rutas de importación (30 min)

**En /services/reminder-service/:**
- `../config/` → `./config/`
- `../middleware/` → `../../../shared/middleware/` o `./middleware/`
- Verificar todas las importaciones

### Fase 4: Crear docker-compose coordinado (20 min)

**En /infrastructure/docker/docker-compose.yml:**
- Apuntar a /services/reminder-service/Dockerfile
- Apuntar a /services/auth-service/Dockerfile
- Apuntar a /services/notification-service/Dockerfile

### Fase 5: Validar (15 min)

```bash
cd services/reminder-service && npm test
cd services/auth-service && npm test
docker-compose up --build
```

---

## 📁 Estructura Esperada Final

```
phase-3-arq-sof-2/
├── services/
│   ├── reminder-service/
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── middleware/
│   │   │   ├── models/
│   │   │   ├── repositories/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── utils/
│   │   │   ├── __tests__/
│   │   │   ├── app.ts
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── init.sql
│   │
│   ├── auth-service/
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── middleware/
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── instrumentation/
│   │   │   ├── __tests__/
│   │   │   ├── app.ts
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── init.sql
│   │
│   └── notification-service/
│       ├── src/
│       ├── Dockerfile
│       ├── package.json
│       └── init.sql
│
├── shared/
│   ├── middleware/
│   │   ├── error.middleware.ts
│   │   ├── logging.middleware.ts
│   │   └── validation.middleware.ts
│   ├── infrastructure/
│   │   ├── database.ts
│   │   ├── messaging.ts
│   │   └── cache.ts
│   └── utils/
│       ├── logger.ts
│       └── validators.ts
│
├── infrastructure/
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   └── docker-compose.prod.yml
│   └── observability/
│       ├── prometheus.yml
│       └── grafana/
│
├── docs/
├── scripts/
├── config/
├── package.json (RAÍZ - scripts coordinados)
└── tsconfig.base.json (compartido)
```

---

## 🔀 Cambios en Archivos Clave

### 1. `/services/reminder-service/src/index.ts`

```typescript
// ANTES (rutas incorrectas):
import app from '../app';
import { initializeDatabase } from '../config/database';
import { initializeOpenTelemetry } from '../instrumentation/opentelemetry';

// DESPUÉS (rutas correctas):
import app from './app';
import { initializeDatabase } from './config/database';
import { initializeOpenTelemetry } from './instrumentation/opentelemetry';

// Si usa shared:
import { createLogger } from '../../../shared/utils/logger';
```

### 2. `/services/reminder-service/package.json`

```json
{
  "name": "reminder-service",
  "version": "1.0.0",
  "private": true,
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "test": "jest --coverage",
    "test:unit": "jest src/__tests__/unit",
    "test:integration": "jest src/__tests__/integration",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write \"src/**/*.ts\""
  }
}
```

### 3. `/package.json` (raíz)

```json
{
  "name": "phase-3-arq-sof-2",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "services/*"
  ],
  "scripts": {
    "dev": "npm run dev --workspaces",
    "build": "npm run build --workspaces",
    "test": "npm test --workspaces",
    "test:coverage": "npm run test:coverage --workspaces",
    "docker:up": "docker-compose -f infrastructure/docker/docker-compose.yml up --build",
    "docker:down": "docker-compose -f infrastructure/docker/docker-compose.yml down",
    "docker:logs": "docker-compose -f infrastructure/docker/docker-compose.yml logs -f"
  }
}
```

### 4. `/infrastructure/docker/docker-compose.yml`

```yaml
version: '3.8'

services:
  reminder-service:
    build:
      context: ../../services/reminder-service
      dockerfile: Dockerfile
    container_name: reminder-service
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/reminders_db
      NODE_ENV: development
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - unisalle-network

  auth-service:
    build:
      context: ../../services/auth-service
      dockerfile: Dockerfile
    container_name: auth-service
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/auth_db
      NODE_ENV: development
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - unisalle-network

  postgres:
    image: postgres:15-alpine
    container_name: postgres
    environment:
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ../../services/reminder-service/init.sql:/docker-entrypoint-initdb.d/1-reminders.sql
      - ../../services/auth-service/init.sql:/docker-entrypoint-initdb.d/2-auth.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - unisalle-network

volumes:
  postgres_data:

networks:
  unisalle-network:
    driver: bridge
```

---

## 🚀 Pasos de Ejecución

```bash
# 1. Eliminiar duplicados
rm -rf src/
rm -rf auth-service/

# 2. Reorganizar auth-service
# (mover src/* a raíz si es necesario)

# 3. Actualizar rutas de importación en reminder-service
# Buscar y reemplazar patrones

# 4. Actualizar package.json raíz y servicios

# 5. Instalar dependencias en workspace
npm install

# 6. Validar estructura
npm run build --workspaces
npm test --workspaces

# 7. Probar docker-compose
docker-compose -f infrastructure/docker/docker-compose.yml up --build
```

---

## ✨ Beneficios de Nueva Estructura

✅ **Separación Clara**: Cada servicio es independiente  
✅ **Escalabilidad**: Fácil agregar nuevos servicios  
✅ **Código Compartido**: `shared/` reutilizable  
✅ **Deployment**: Docker Compose coordinado  
✅ **Monorepo**: Scripts unificados con npm workspaces  

---

