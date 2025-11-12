# 🚀 Quickstart - SOA Platform

Guía rápida para levantar la plataforma SOA completa en menos de 5 minutos.

## 📋 Prerrequisitos

- **Docker & Docker Compose** (versión 3.8+)
- **Git**
- **Terminal/Shell** (zsh, bash, etc.)

```bash
# Verificar instalación
docker --version
docker compose version
```

## ⚡ Inicio Rápido (3 comandos)

```bash
# 1. Clonar el repositorio
git clone <repository-url>
cd phase-3-arq-sof-2

# 2. Construir y ejecutar todo
docker compose -f infrastructure/docker/docker-compose.yml up -d --build

# 3. Verificar que todo funciona
./scripts/health-check.sh
```

¡Listo! Tu plataforma SOA está ejecutándose. 🎉

## 🌐 Acceder a los Servicios

| Servicio | URL | Descripción |
|----------|-----|-------------|
| **Reminder Service** | http://localhost:3000 | Gestión de recordatorios |
| **Auth Service** | http://localhost:3001 | Autenticación OIDC |
| **Notification Service** | http://localhost:3002 | Notificaciones push |
| **Keycloak Admin** | http://localhost:8080 | Gestión de identidad |
| **RabbitMQ** | http://localhost:15672 | Message broker |
| **Jaeger** | http://localhost:16686 | Trazabilidad |
| **Prometheus** | http://localhost:9090 | Métricas |

## 👤 Usuarios de Prueba

Después de ejecutar `setup-keycloak.sh`:

- **Estudiante**: `student1` / `password123`
- **Profesor**: `teacher1` / `password123`

## 🧪 Probar la Plataforma

### Opción 1: Script Automático (Recomendado)

```bash
# Ejecuta pruebas completas de todos los servicios
./scripts/test-platform.sh
```

### Opción 2: Pruebas Manuales

```bash
# Configurar Keycloak (requerido para auth)
./scripts/setup-keycloak.sh

# Probar health checks individuales
curl http://localhost:3000/health  # Reminder
curl http://localhost:3001/health  # Auth
curl http://localhost:3002/health  # Notification

# Ver logs en tiempo real
docker compose -f infrastructure/docker/docker-compose.yml logs -f
```

## 🔧 Comandos Útiles

### Gestión de Contenedores

```bash
# Ver estado de servicios
docker compose -f infrastructure/docker/docker-compose.yml ps

# Ver logs de un servicio específico
docker compose -f infrastructure/docker/docker-compose.yml logs -f reminder-service

# Reiniciar un servicio
docker compose -f infrastructure/docker/docker-compose.yml restart auth-service

# Detener todo
docker compose -f infrastructure/docker/docker-compose.yml down

# Limpiar volúmenes (borra datos)
docker compose -f infrastructure/docker/docker-compose.yml down -v
```

### Desarrollo Local

```bash
# Instalar dependencias de todos los servicios
npm run install:all

# Ejecutar un servicio en modo desarrollo
npm run dev:reminder    # Reminder Service
npm run dev:auth        # Auth Service
npm run dev:notification # Notification Service

# Ejecutar tests
npm run test:all
```

## 🐛 Solución de Problemas

### Servicios no inician

```bash
# Verificar que no hay conflictos de puertos
docker ps -a
lsof -i :3000,3001,3002,5432,8080

# Limpiar y reconstruir
docker compose -f infrastructure/docker/docker-compose.yml down -v
docker compose -f infrastructure/docker/docker-compose.yml up -d --build --force-recreate
```

### Base de datos no conecta

```bash
# Verificar PostgreSQL
docker exec -it reminders-postgres pg_isready -U postgres

# Revisar logs de base de datos
docker compose -f infrastructure/docker/docker-compose.yml logs postgres
```

### Keycloak no funciona

```bash
# Reiniciar Keycloak
docker compose -f infrastructure/docker/docker-compose.yml restart keycloak

# Reconfigurar (esperar 30 segundos)
./scripts/setup-keycloak.sh
```

## 📊 Monitoreo

### Health Checks

```bash
# Todos los servicios
./scripts/health-check.sh

# Individual
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
```

### Métricas y Logs

- **Prometheus**: `http://localhost:9090` (métricas)
- **Jaeger**: `http://localhost:16686` (trazas)
- **RabbitMQ**: `http://localhost:15672` (colas)

## 🏗️ Arquitectura

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Reminder       │    │  Auth           │    │  Notification   │
│  Service        │◄──►│  Service        │◄──►│  Service        │
│  (Port 3000)    │    │  (Port 3001)    │    │  (Port 3002)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  PostgreSQL     │
                    │  + RabbitMQ     │
                    │  + Keycloak     │
                    └─────────────────┘
```

## 🎯 Próximos Pasos

1. **API Testing**: Usa Postman o curl para probar los endpoints
2. **Desarrollo**: Modifica el código en `services/*/src/`
3. **Base de Datos**: Explora los esquemas en `services/*/init.sql`
4. **Configuración**: Ajusta variables en `docker-compose.yml`

## 📞 Soporte

Si algo no funciona:

1. Ejecuta `./scripts/health-check.sh` para diagnóstico
2. Revisa logs: `docker compose logs -f <service-name>`
3. Verifica puertos libres
4. Reinicia con `docker compose down && docker compose up -d --build`

---

**Tiempo estimado**: 5 minutos para setup completo
**Recursos requeridos**: 4GB RAM, 10GB disco</content>
<parameter name="filePath">/Users/home/Documents/universidad/phase-3-arq-sof-2/QUICKSTART.md
