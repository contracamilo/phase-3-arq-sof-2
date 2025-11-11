# AI companion - Arquitectura SOA

Un servicio REST de recordatorios construido con principios de Arquitectura Orientada a Servicios (SOA) utilizando Node.js, TypeScript, Express, PostgreSQL y Docker Compose.

## 🎯 Características

- **Operaciones CRUD**: Operaciones completas de Crear, Leer, Actualizar, Eliminar para recordatorios
- **Idempotencia**: Las solicitudes POST admiten claves de idempotencia para prevenir creaciones duplicadas
- **Manejo de Errores**: Manejo completo de errores con códigos de estado HTTP significativos
- **Registro de Eventos**: Orquestación simulada y mensajería con registros de eventos
- **Validación de Datos**: Validación de solicitudes para todos los endpoints
- **Soporte Docker**: Configuración completa de Docker Compose con PostgreSQL
- **Pruebas Automatizadas**: Suite de pruebas basada en Jest con supertest
- **TypeScript**: Implementación segura de tipos

## 📋 Prerrequisitos

- Node.js 18+ (para desarrollo local)
- Docker y Docker Compose (recomendado)
- PostgreSQL 15+ (si se ejecuta sin Docker)

## 🚀 Inicio Rápido

### Usando Docker Compose (Recomendado)

1. Clona el repositorio:
```bash
git clone https://github.com/contracamilo/phase-3-arq-sof-2.git
cd phase-3-arq-sof-2
```

2. Inicia los servicios:
```bash
docker-compose up --build
```

La API estará disponible en `http://localhost:3000`

### Desarrollo Local

1. Instala dependencias:
```bash
npm install
```

2. Crea archivo `.env`:
```bash
cp .env.example .env
```

3. Inicia PostgreSQL (usando Docker):
```bash
docker-compose up postgres
```

4. Ejecuta el servidor de desarrollo:
```bash
npm run dev
```

## 📊 Esquema de Base de Datos

### Tabla de Recordatorios
```sql
CREATE TABLE reminders (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla de Claves de Idempotencia
```sql
CREATE TABLE idempotency_keys (
    key VARCHAR(255) PRIMARY KEY,
    reminder_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE
);
```

## � Documentación Swagger/OpenAPI

La API expone documentación interactiva de Swagger en múltiples formatos:

### Swagger UI (Interactivo)
```
GET http://localhost:3000/api-docs
```
Interfaz web interactiva donde puedes probar los endpoints directamente.

### Especificación OpenAPI Raw
```
GET http://localhost:3000/openapi.yaml
```
Descarga la especificación completa en formato YAML.

### Acceso Rápido
El endpoint raíz proporciona referencias útiles:
```
GET http://localhost:3000
```
Respuesta:
```json
{
  "message": "Reminders Service API",
  "version": "1.0.0",
  "endpoints": {
    "health": "/health",
    "api": "/v1/reminders",
    "docs": "/api-docs",
    "openapi": "/openapi.yaml"
  }
}
```

## �🔌 Endpoints de API

### Verificación de Salud
```
GET /health
```
Devuelve el estado de salud del servicio.

**Respuesta:**
```json
{
  "status": "healthy",
  "service": "Reminder Service",
  "timestamp": "2025-11-10T21:59:37.123Z"
}
```

### Crear Recordatorio
```
POST /api/reminders
```

**Encabezados:**
- `Content-Type: application/json`
- `Idempotency-Key: <uuid>` (opcional)

**Cuerpo de la Solicitud:**
```json
{
  "title": "Reunión de Equipo",
  "description": "Reunión de revisión trimestral",
  "due_date": "2025-12-15T10:00:00Z",
  "status": "pending"
}
```

**Respuesta (201):**
```json
{
  "status": "success",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Reunión de Equipo",
    "description": "Reunión de revisión trimestral",
    "due_date": "2025-12-15T10:00:00.000Z",
    "status": "pending",
    "created_at": "2025-11-10T22:00:00.000Z",
    "updated_at": "2025-11-10T22:00:00.000Z"
  }
}
```

### Obtener Todos los Recordatorios
```
GET /api/reminders
```

**Respuesta (200):**
```json
{
  "status": "success",
  "count": 2,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "Reunión de Equipo",
      "description": "Reunión de revisión trimestral",
      "due_date": "2025-12-15T10:00:00.000Z",
      "status": "pending",
      "created_at": "2025-11-10T22:00:00.000Z",
      "updated_at": "2025-11-10T22:00:00.000Z"
    }
  ]
}
```

### Obtener Recordatorio por ID
```
GET /api/reminders/:id
```

**Respuesta (200):**
```json
{
  "status": "success",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Reunión de Equipo",
    "description": "Reunión de revisión trimestral",
    "due_date": "2025-12-15T10:00:00.000Z",
    "status": "pending",
    "created_at": "2025-11-10T22:00:00.000Z",
    "updated_at": "2025-11-10T22:00:00.000Z"
  }
}
```

**Respuesta (404):**
```json
{
  "status": "error",
  "message": "Recordatorio no encontrado"
}
```

### Actualizar Recordatorio
```
PUT /api/reminders/:id
```

**Cuerpo de la Solicitud (todos los campos opcionales):**
```json
{
  "title": "Reunión de Equipo Actualizada",
  "description": "Descripción actualizada",
  "due_date": "2025-12-20T10:00:00Z",
  "status": "completed"
}
```

**Respuesta (200):**
```json
{
  "status": "success",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Reunión de Equipo Actualizada",
    "description": "Descripción actualizada",
    "due_date": "2025-12-20T10:00:00.000Z",
    "status": "completed",
    "created_at": "2025-11-10T22:00:00.000Z",
    "updated_at": "2025-11-10T22:10:00.000Z"
  }
}
```

### Eliminar Recordatorio
```
DELETE /api/reminders/:id
```

**Respuesta (200):**
```json
{
  "status": "success",
  "message": "Recordatorio eliminado exitosamente"
}
```

## 🔐 Idempotencia

El servicio admite idempotencia para solicitudes POST para prevenir la creación duplicada de recordatorios. Envía un encabezado `Idempotency-Key` con un UUID único:

```bash
curl -X POST http://localhost:3000/api/reminders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "title": "Recordatorio Importante",
    "due_date": "2025-12-15T10:00:00Z"
  }'
```

Las solicitudes subsiguientes con la misma clave de idempotencia devolverán el mismo recordatorio sin crear un duplicado.

## 🔄 Registro de Eventos (Simulación SOA)

El servicio simula patrones de orquestación SOA y mensajería a través del registro de eventos. Cada operación registra eventos que normalmente se publicarían a un corredor de mensajes (ej. RabbitMQ, Kafka):

**Tipos de Eventos:**
- `REMINDER_CREATED`
- `REMINDER_UPDATED`
- `REMINDER_DELETED`
- `REMINDER_RETRIEVED`
- `REMINDER_LIST_RETRIEVED`
- `IDEMPOTENT_REQUEST`
- `ERROR_OCCURRED`

**Ejemplo de Registro de Eventos:**
```json
{
  "event": "REMINDER_CREATED",
  "timestamp": "2025-11-10T22:00:00.000Z",
  "service": "REMINDER_SERVICE",
  "payload": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Reunión de Equipo",
    "idempotencyKey": null
  }
}
```

## 🧪 Pruebas

### Ejecutar Pruebas
```bash
npm test
```

### Ejecutar Pruebas con Cobertura
```bash
npm run test:coverage
```

### Ejecutar Pruebas en Modo Vigilancia
```bash
npm run test:watch
```

La suite de pruebas incluye:
- Pruebas de operaciones CRUD
- Pruebas de validación
- Pruebas de idempotencia
- Pruebas de manejo de errores
- Pruebas de verificación de salud

## 🏗️ Estructura del Proyecto

```
.
├── src/
│   ├── __tests__/          # Archivos de prueba
│   │   └── reminder.test.ts
│   ├── config/             # Configuración
│   │   └── database.ts
│   ├── middleware/         # Middleware de Express
│   │   ├── error.middleware.ts
│   │   └── validation.middleware.ts
│   ├── models/             # Modelos de datos y tipos
│   │   └── reminder.model.ts
│   ├── routes/             # Rutas de API
│   │   └── reminder.routes.ts
│   ├── services/           # Lógica de negocio
│   │   └── reminder.service.ts
│   ├── utils/              # Utilidades
│   │   └── logger.ts
│   ├── app.ts              # Configuración de aplicación Express
│   └── index.ts            # Punto de entrada
├── docker-compose.yml      # Configuración de Docker Compose
├── Dockerfile              # Definición de imagen de contenedor
├── init.sql                # Inicialización de base de datos
├── jest.config.js          # Configuración de Jest
├── tsconfig.json           # Configuración de TypeScript
├── package.json            # Dependencias y scripts
└── README.md               # Este archivo
```

## 🛠️ Scripts de Desarrollo

- `npm run build` - Construir TypeScript a JavaScript
- `npm start` - Ejecutar construcción de producción
- `npm run dev` - Ejecutar servidor de desarrollo con recarga en caliente
- `npm test` - Ejecutar pruebas
- `npm run test:watch` - Ejecutar pruebas en modo vigilancia
- `npm run test:coverage` - Ejecutar pruebas con reporte de cobertura

## 🐳 Comandos Docker

### Iniciar todos los servicios
```bash
docker-compose up
```

### Iniciar en modo desacoplado
```bash
docker-compose up -d
```

### Ver registros
```bash
docker-compose logs -f
```

### Detener servicios
```bash
docker-compose down
```

### Reconstruir e iniciar
```bash
docker-compose up --build
```

## 📝 Variables de Entorno

Crea un archivo `.env` basado en `.env.example`:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/reminders_db
NODE_ENV=development
```

## 🏛️ Principios de Arquitectura SOA

Este servicio sigue principios SOA:

1. **Contrato de Servicio**: API REST bien definida con esquemas claros de solicitud/respuesta
2. **Acoplamiento Bajo**: Operaciones de base de datos aisladas en capa de servicio
3. **Abstracción**: Detalles de implementación ocultos detrás de interfaz API
4. **Reutilización**: Operaciones CRUD genéricas aplicables a otros servicios
5. **Sin Estado**: Diseño RESTful sin estado (idempotencia para seguridad)
6. **Descubribilidad**: API autodocumentada con verificaciones de salud
7. **Orientado a Eventos**: Publicación simulada de eventos para orquestación de servicios

## 🤝 Contribuyendo

1. Haz fork del repositorio
2. Crea una rama de característica
3. Haz tus cambios
4. Ejecuta pruebas: `npm test`
5. Construye: `npm run build`
6. Envía una solicitud de extracción

## 📄 Licencia

ISC

## 👥 Autor

Proyecto académico para Arquitectura de Software - Fase 3

## 🆘 Solución de Problemas

### Puerto Ya en Uso
Si el puerto 3000 o 5432 ya están en uso, cambia los puertos en `.env` y `docker-compose.yml`.

### Conexión de Base de Datos Fallida
Asegúrate de que PostgreSQL esté ejecutándose y que la cadena de conexión en `.env` sea correcta.

### Pruebas Fallando
Asegúrate de que la base de datos esté ejecutándose y sea accesible antes de ejecutar pruebas.

## 📚 Recursos Adicionales

- [Documentación de Express.js](https://expressjs.com/)
- [Documentación de PostgreSQL](https://www.postgresql.org/docs/)
- [Documentación de TypeScript](https://www.typescriptlang.org/)
- [Documentación de Docker](https://docs.docker.com/)
- [Principios SOA](https://en.wikipedia.org/wiki/Service-oriented_architecture)
