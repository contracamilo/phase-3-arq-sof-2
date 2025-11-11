# 🎨 Swagger UI - Guía de Configuración

## Descripción

La API REST de Recordatorios expone documentación interactiva con Swagger UI. Esto permite:
- ✅ Explorar todos los endpoints disponibles
- ✅ Probar las APIs directamente en el navegador
- ✅ Ver esquemas de solicitud/respuesta
- ✅ Acceder a la especificación OpenAPI 3.1.0

## 📋 Endpoints de Documentación

### 1. Swagger UI Interactivo (Recomendado)
**URL:** `http://localhost:3000/api-docs`

Interfaz web visual donde puedes:
- Ver todos los endpoints
- Probar las APIs con parámetros reales
- Ver las respuestas en tiempo real
- Descargar la especificación

### 2. Especificación OpenAPI Raw (YAML)
**URL:** `http://localhost:3000/openapi.yaml`

Descarga directa de la especificación en formato YAML, útil para:
- Integración con herramientas externas
- Generación de código cliente
- Validación de esquema

### 3. Punto de Entrada de la API
**URL:** `http://localhost:3000/`

Retorna un JSON con referencias rápidas a todos los endpoints:
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

## 🚀 Cómo Acceder

### Opción 1: Local con Docker Compose
```bash
# Inicia todos los servicios
docker-compose up --build

# Accede a Swagger UI
# http://localhost:3000/api-docs
```

### Opción 2: Local sin Docker
```bash
# 1. Asegúrate de que PostgreSQL esté corriendo
docker-compose up postgres

# 2. En otra terminal, inicia el servidor
npm run dev

# 3. Accede a Swagger UI
# http://localhost:3000/api-docs
```

## 📖 Navegación en Swagger UI

### 1. Explorar Endpoints
- Los endpoints están organizados por tags (ej: reminders, health)
- Expande cada endpoint para ver detalles
- Lee la descripción de cada operación

### 2. Probar un Endpoint
- Haz clic en el endpoint que deseas probar
- Completa los parámetros requeridos
- Haz clic en "Try it out"
- Envía la solicitud y ve la respuesta

### 3. Descargar Especificación
- Haz clic en el botón "Download" en la esquina superior derecha
- Se descargará el archivo `openapi.yaml`

## 🔍 Estructura de la Especificación OpenAPI

La especificación incluye:

### Información General
```yaml
openapi: 3.1.0
info:
  title: Reminders Service API
  description: SOA-based reminder service
  version: 1.0.0
```

### Servidores
```yaml
servers:
  - url: http://localhost:3000
    description: Development server
```

### Componentes (Schemas)
- `Reminder`: Modelo de recordatorio
- `CreateReminderDTO`: Datos para crear recordatorio
- `UpdateReminderDTO`: Datos para actualizar recordatorio
- `ApiResponse`: Respuesta estándar de la API
- `ErrorResponse`: Respuesta de error

### Paths (Endpoints)
- `GET /health`: Verificar salud del servicio
- `GET /api/reminders`: Obtener todos los recordatorios
- `GET /api/reminders/{id}`: Obtener recordatorio por ID
- `POST /api/reminders`: Crear nuevo recordatorio
- `PUT /api/reminders/{id}`: Actualizar recordatorio
- `DELETE /api/reminders/{id}`: Eliminar recordatorio

## 💡 Ejemplos de Uso

### Crear un Recordatorio
1. Abre Swagger UI: `http://localhost:3000/api-docs`
2. Localiza `POST /api/reminders`
3. Haz clic en "Try it out"
4. Completa el cuerpo de la solicitud:
```json
{
  "title": "Reunión de Equipo",
  "description": "Revisión trimestral",
  "due_date": "2025-12-15T10:00:00Z",
  "status": "pending"
}
```
5. Haz clic en "Execute"
6. Verás la respuesta con el recordatorio creado

### Usar Idempotencia
Al crear recordatorios, puedes incluir un header de idempotencia:
1. En Swagger UI, expande `POST /api/reminders`
2. Scroll down para encontrar la sección de headers
3. Agrega header: `Idempotency-Key: <uuid-único>`
4. Las solicitudes subsiguientes con la misma key retornarán el mismo recordatorio

## 🔐 Autenticación (Próximas versiones)

Actualmente, la API no requiere autenticación. En futuras versiones se pueden agregar:
- JWT Bearer tokens
- API Keys
- OAuth 2.0

## 📱 Alternativas de Visualización

### Opción 1: Swagger Editor Online
Si no quieres instalar nada localmente:
1. Ve a https://editor.swagger.io/
2. En el menú File → Import URL
3. Pega: `http://localhost:3000/openapi.yaml`

### Opción 2: Postman
Puedes importar la especificación OpenAPI en Postman:
1. Abre Postman
2. New → API → Copy your API link
3. Pega: `http://localhost:3000/openapi.yaml`

### Opción 3: ReDoc
Visualización alternativa más minimalista:
```bash
# Instala ReDoc CLI (opcional)
npm install -g @redocly/cli

# Abre la documentación
redoc-cli serve http://localhost:3000/openapi.yaml
```

## 🛠️ Dependencias Utilizadas

- `swagger-ui-express`: Middleware para servir Swagger UI
- `js-yaml`: Parser de YAML para leer la especificación
- `@types/swagger-ui-express`: Definiciones TypeScript
- `@types/js-yaml`: Definiciones TypeScript

## 📝 Archivos Relacionados

- `openapi.yaml`: Especificación completa de la API
- `src/app.ts`: Configuración de los endpoints de documentación
- `src/routes/reminder.routes.ts`: Definición de endpoints

## ✅ Verificación

Para verificar que Swagger esté funcionando correctamente:

```bash
# 1. Inicia el servidor
npm run dev

# 2. En otra terminal, verifica los endpoints
curl http://localhost:3000/

# 3. Verifica que Swagger UI esté disponible
curl -I http://localhost:3000/api-docs

# 4. Descarga la especificación
curl http://localhost:3000/openapi.yaml
```

## 🐛 Troubleshooting

### Error: "Cannot GET /api-docs"
- Asegúrate de que `swagger-ui-express` y `js-yaml` estén instalados
- Ejecuta: `npm install`
- Reinicia el servidor

### Error: "Cannot find openapi.yaml"
- El archivo `openapi.yaml` debe estar en la raíz del proyecto
- Verifica que el archivo exista: `ls -la openapi.yaml`

### Error: "Error loading swagger document"
- Verifica que `openapi.yaml` sea válido YAML
- Intenta validar en: https://editor.swagger.io/

### Swagger carga pero sin estilos
- Limpia el caché del navegador (Ctrl+Shift+Delete)
- Intenta en modo incógnito

## 📚 Recursos Adicionales

- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)
- [OpenAPI Specification](https://spec.openapis.org/oas/v3.1.0)
- [swagger-ui-express GitHub](https://github.com/scottie1984/swagger-ui-express)
- [OpenAPI Best Practices](https://swagger.io/resources/articles/best-practices-in-api-documentation/)
