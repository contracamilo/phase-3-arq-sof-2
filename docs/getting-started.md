# 🚀 Guía de Inicio - SOA Architecture Platform

Esta guía te ayudará a ejecutar la plataforma SOA completa, incluyendo instalaciones, contenedores, servicios, documentación Swagger, testing y métricas.

## 📋 Prerrequisitos

### Sistema Operativo

- **macOS**: 12.0 o superior
- **Linux**: Ubuntu 20.04+, CentOS 8+, RHEL 8+
- **Windows**: Windows 10/11 con WSL2

### Software Requerido

#### Docker y Docker Compose

```bash
# Verificar instalación
docker --version
docker compose version

# Si no está instalado (macOS con Homebrew)
brew install docker docker-compose

# Si no está instalado (Ubuntu/Debian)
sudo apt update
sudo apt install docker.io docker-compose
```

#### Node.js (para desarrollo local)

```bash
# Verificar instalación
node --version  # Debe ser 18+
npm --version

# Si no está instalado (macOS con Homebrew)
brew install node

# Si no está instalado (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Herramientas Adicionales

```bash
# jq (para procesamiento JSON en scripts)
# macOS
brew install jq

# Ubuntu/Debian
sudo apt install jq

# curl (generalmente preinstalado)
curl --version
```

## 🏃‍♂️ Inicio Rápido (5 minutos)

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd phase-3-arq-sof-2
```

### 2. Ejecutar la Plataforma Completa

```bash
# Construir y ejecutar todos los servicios
docker compose -f infrastructure/docker/docker-compose.yml up -d --build

# Verificar que todo esté funcionando
./scripts/health-check.sh
```

### 3. Configurar Keycloak

```bash
# Configurar usuarios y clientes OIDC
./scripts/setup-keycloak.sh
```

### 4. Verificar Funcionamiento

```bash
# Ejecutar tests de integración
./scripts/test-platform.sh
```

¡La plataforma estará lista en `http://localhost:3000`!

## 🐳 Ejecución con Contenedores

### Servicios Disponibles

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| **Reminder Service** | 3000 | Gestión de recordatorios |
| **Auth Service** | 3001 | Autenticación OIDC |
| **Notification Service** | 3002 | Plantillas y notificaciones |
| **Keycloak** | 8080 | Proveedor de identidad |
| **PostgreSQL** | 5432 | Base de datos |
| **RabbitMQ** | 5672/15672 | Message broker |
| **Prometheus** | 9090 | Métricas |
| **Grafana** | 3003 | Dashboards |
| **Jaeger** | 16686 | Trazabilidad |

### Comandos Básicos de Docker

```bash
# Ver estado de contenedores
docker compose ps

# Ver logs de todos los servicios
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f reminder-service

# Reiniciar un servicio
docker compose restart reminder-service

# Detener todos los servicios
docker compose down
```

## 🔧 Desarrollo Local

### Ejecutar Servicio Individual

#### Reminder Service

```bash
cd services/reminder-service

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Ejecutar tests
npm test

# Ver documentación API
open http://localhost:3000/api-docs
```

#### Auth Service

```bash
cd services/auth-service

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Ejecutar tests
npm test

# Ver documentación API
open http://localhost:3001/api-docs
```

#### Notification Service

```bash
cd services/notification-service

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Ejecutar tests
npm test

# Ver documentación API
open http://localhost:3002/api-docs
```

## 📡 Documentación API (Swagger)

Cada servicio expone documentación interactiva de su API:

### Reminder Service API

- **URL**: http://localhost:3000/api-docs
- **Endpoints principales**:
  - `GET /health` - Estado del servicio
  - `GET /reminders` - Listar recordatorios
  - `POST /reminders` - Crear recordatorio
  - `GET /reminders/{id}` - Obtener recordatorio
  - `PUT /reminders/{id}` - Actualizar recordatorio
  - `DELETE /reminders/{id}` - Eliminar recordatorio

### Auth Service API

- **URL**: http://localhost:3001/api-docs
- **Endpoints principales**:
  - `GET /health` - Estado del servicio
  - `GET /auth/login` - Iniciar flujo OIDC
  - `POST /auth/token` - Intercambiar código por tokens
  - `GET /auth/userinfo` - Información del usuario autenticado

### Notification Service API

- **URL**: http://localhost:3002/api-docs
- **Endpoints principales**:
  - `GET /health` - Estado del servicio
  - `GET /notifications/templates` - Listar plantillas
  - `POST /notifications/templates` - Crear plantilla
  - `GET /notifications/templates/{code}` - Obtener plantilla
  - `PUT /notifications/templates/{code}` - Actualizar plantilla
  - `DELETE /notifications/templates/{code}` - Eliminar plantilla

## 🧪 Testing

### Tests Unitarios

```bash
# Ejecutar tests de todos los servicios
npm test

# Ejecutar tests de un servicio específico
cd services/notification-service && npm test
cd services/auth-service && npm test
cd services/reminder-service && npm test
```

### Tests de Integración

```bash
# Ejecutar tests de integración completos
./scripts/test-platform.sh

# Verificar conectividad entre servicios
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
```

### Usuarios de Prueba

Después de ejecutar `setup-keycloak.sh`, estarán disponibles:

- **Estudiante**: `student1` / `password123`
- **Profesor**: `teacher1` / `password123`
- **Admin**: `admin` / `admin`

## 📊 Monitoreo y Métricas

### Métricas de Negocio

La plataforma expone métricas de negocio en formato Prometheus:

#### Auth Service Metrics

```bash
curl http://localhost:3001/metrics
```

- `auth_logins_initiated_total` - Logins iniciados
- `auth_logins_successful_total` - Logins exitosos
- `auth_tokens_issued_total` - Tokens emitidos
- `auth_tokens_validated_total` - Tokens validados

#### Notification Service Metrics

```bash
curl http://localhost:3002/metrics
```

- `notification_templates_created_total` - Templates creados
- `notification_templates_rendered_total` - Templates usados
- `notification_template_rendering_duration` - Tiempo de renderizado

#### Reminder Service Metrics

```bash
curl http://localhost:3000/metrics
```

- `reminders_created_total` - Recordatorios creados
- `idempotency_conflicts_total` - Conflictos de idempotencia
- `reminder_processing_duration` - Tiempo de procesamiento

### Dashboards de Monitoreo

#### Grafana

- **URL**: http://localhost:3003
- **Usuario**: admin
- **Contraseña**: admin
- **Dashboard**: SOA Business Metrics

#### Prometheus

- **URL**: http://localhost:9090
- **Query**: `up{job="reminder-service"}` (verificar estado)

#### Jaeger (Trazabilidad)

- **URL**: http://localhost:16686
- Visualiza trazas distribuidas entre servicios

## 🔍 Health Checks

### Verificación Automática

```bash
# Verificar todos los servicios
./scripts/health-check.sh

# Salida esperada:
# ✅ PostgreSQL is healthy
# ✅ RabbitMQ is healthy
# ✅ Keycloak is healthy
# ✅ Reminder Service is healthy
# ✅ Auth Service is healthy
# ✅ Notification Service is healthy
```

### Verificación Manual

```bash
# Servicios individuales
curl -f http://localhost:3000/health && echo "✅ Reminder Service"
curl -f http://localhost:3001/health && echo "✅ Auth Service"
curl -f http://localhost:3002/health && echo "✅ Notification Service"

# Base de datos
docker compose exec postgres pg_isready -U postgres -d reminders_db

# Message Queue
curl -f http://localhost:15672/api/overview && echo "✅ RabbitMQ"
```

## 🐛 Troubleshooting

### Problemas Comunes

#### Puerto ya en uso

```bash
# Ver qué proceso usa el puerto
lsof -i :3000

# Matar proceso
kill -9 <PID>

# O cambiar puerto en docker-compose.yml
```

#### Contenedores no inician

```bash
# Ver logs detallados
docker compose logs reminder-service

# Reconstruir imagen
docker compose build --no-cache reminder-service
```

#### Tests fallan

```bash
# Limpiar node_modules y reinstallar
rm -rf node_modules package-lock.json
npm install

# Verificar variables de entorno
cat .env
```

---

**¿Necesitas más ayuda?** Consulta la [documentación completa](README.md) o crea un issue en el repositorio.
