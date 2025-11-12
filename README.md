# SOA Architecture Platform

Una plataforma de arquitectura orientada a servicios (SOA) para gestión académica universitaria, implementada con Node.js, TypeScript, PostgreSQL, RabbitMQ y Keycloak.

## ⚡ Quickstart

¿Quieres empezar inmediatamente? Consulta nuestra **[Guía de Quickstart](QUICKSTART.md)** para levantar la plataforma completa en menos de 5 minutos.

```bash
git clone <repository-url>
cd phase-3-arq-sof-2
docker compose -f infrastructure/docker/docker-compose.yml up -d --build
./scripts/health-check.sh
```

## 🏗️ Arquitectura

La plataforma consta de los siguientes servicios:

- **Reminder Service** (Puerto 3000): Gestión de recordatorios y notificaciones
- **Auth Service** (Puerto 3001): Autenticación y autorización con OIDC
- **Notification Service** (Puerto 3002): Envío de notificaciones push y email
- **Keycloak** (Puerto 8080): Proveedor de identidad OIDC
- **PostgreSQL**: Base de datos principal
- **RabbitMQ**: Broker de mensajes
- **Jaeger**: Trazabilidad distribuida
- **Prometheus**: Métricas y monitoreo

## 🚀 Inicio Rápido

### Prerrequisitos

- Docker y Docker Compose
- Node.js 18+ (para desarrollo local)
- jq (para scripts de configuración)

### Ejecutar la Plataforma

1. **Clonar y navegar al directorio:**

   ```bash
   cd phase-3-arq-sof-2
   ```

2. **Construir y ejecutar todos los servicios:**

   ```bash
   docker compose -f infrastructure/docker/docker-compose.yml up -d --build
   ```

3. **Verificar que todos los servicios estén ejecutándose:**

   ```bash
   ./scripts/health-check.sh
   ```

4. **Configurar Keycloak:**

   ```bash
   ./scripts/setup-keycloak.sh
   ```

5. **Ejecutar pruebas completas de la plataforma:**

   ```bash
   ./scripts/test-platform.sh
   ```

## 🔧 Configuración de Servicios

### Variables de Entorno

Cada servicio puede configurarse mediante variables de entorno:

#### Reminder Service

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/reminders_db
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
NODE_ENV=development
PORT=3000
OTEL_SERVICE_NAME=reminders-service
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318
```

#### Auth Service

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/reminders_db
NODE_ENV=development
PORT=3001
JWT_SECRET=your-secret-key
KEYCLOAK_URL=http://keycloak:8080
KEYCLOAK_REALM=soa-realm
KEYCLOAK_CLIENT_ID=soa-client
KEYCLOAK_CLIENT_SECRET=client-secret
```

#### Notification Service

```env
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
GOOGLE_APPLICATION_CREDENTIALS=/app/firebase-credentials.json
FIREBASE_PROJECT_ID=soa-arch-soft
NODE_ENV=development
PORT=3002
```

## 📡 API Endpoints

### Reminder Service API

#### Service Health

```http
GET /health
```

#### Recordatorios

```http
GET    /reminders
POST   /reminders
GET    /reminders/:id
PUT    /reminders/:id
DELETE /reminders/:id
```

#### Idempotency

```http
POST /reminders/idempotent
X-Idempotency-Key: <unique-key>
```

### Auth Service API

#### Service Health

```http
GET /health
```

#### OIDC Authentication

```http
GET  /auth/login
GET  /auth/callback
POST /auth/token
GET  /auth/userinfo
```

### Notification Service API

#### Service Health

```http
GET /health
```

#### Templates

```http
GET    /notifications/templates
POST   /notifications/templates
GET    /notifications/templates/:code
PUT    /notifications/templates/:code
DELETE /notifications/templates/:code
```

#### Deliveries

```http
GET  /notifications/deliveries
POST /notifications/deliveries
```

## 🧪 Testing

### Ejecutar Tests

```bash
# Todos los servicios
npm test

# Servicio específico
cd services/reminder-service && npm test
cd services/auth-service && npm test
cd services/notification-service && npm test
```

### Usuarios de Prueba

Después de ejecutar `setup-keycloak.sh`, estarán disponibles:

- **Estudiante**: `student1` / `password123`
- **Profesor**: `teacher1` / `password123`

### Health Checks

```bash
# Verificar todos los servicios
./scripts/health-check.sh

# Verificar servicio individual
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
```

## 🔍 Monitoreo y Observabilidad

### Jaeger (Trazabilidad)

- URL: `http://localhost:16686`
- Visualiza trazas distribuidas entre servicios

### Prometheus (Métricas)

- URL: `http://localhost:9090`
- Métricas de rendimiento y salud

### RabbitMQ Management

- URL: `http://localhost:15672`
- Usuario: `guest`
- Contraseña: `guest`

### Keycloak Admin Console

- URL: `http://localhost:8080`
- Usuario: `admin`
- Contraseña: `admin`

## 🐳 Desarrollo Local

### Ejecutar Servicio Individual

```bash
# Reminder Service
cd services/reminder-service
npm install
npm run dev

# Auth Service
cd services/auth-service
npm install
npm run dev

# Notification Service
cd services/notification-service
npm install
npm run dev
```

### Base de Datos Local

```bash
# Ejecutar solo PostgreSQL y RabbitMQ
docker compose -f infrastructure/docker/docker-compose.yml up postgres rabbitmq -d
```

## 📁 Estructura del Proyecto

```text
├── services/
│   ├── reminder-service/     # Servicio de recordatorios
│   ├── auth-service/         # Servicio de autenticación
│   └── notification-service/ # Servicio de notificaciones
├── infrastructure/
│   └── docker/
│       └── docker-compose.yml
├── scripts/
│   ├── setup-keycloak.sh     # Configuración de Keycloak
│   └── health-check.sh       # Verificación de salud
├── shared/                   # Código compartido
├── integration/              # Configuraciones de integración
└── src/                      # Código legacy (para migrar)
```

## 🔐 Seguridad

- **OIDC**: Autenticación basada en Keycloak
- **JWT**: Tokens para autorización entre servicios
- **Idempotency**: Prevención de operaciones duplicadas
- **CORS**: Configurado por servicio
- **Rate Limiting**: Implementado en middleware

## 🚀 Despliegue

### Producción

```bash
# Construir imágenes optimizadas
docker compose -f infrastructure/docker/docker-compose.yml build --no-cache

# Ejecutar en modo producción
NODE_ENV=production docker compose -f infrastructure/docker/docker-compose.yml up -d
```

### Escalado

```bash
# Escalar servicios
docker compose up -d --scale notification-service=3
```

## 🐛 Troubleshooting

### Logs

```bash
# Todos los logs
docker compose logs -f

# Log de servicio específico
docker compose logs -f reminder-service
```

### Reinicio de Servicios

```bash
# Reiniciar todo
docker compose restart

# Reiniciar servicio específico
docker compose restart reminder-service
```

### Limpieza

```bash
# Detener y eliminar contenedores
docker compose down

# Eliminar volúmenes
docker compose down -v

# Limpiar imágenes
docker system prune -f
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.
