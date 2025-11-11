# 📚 Documentación - SOA Microservices Platform

Bienvenido a la documentación completa de la plataforma SOA de AI Companion Unisalle. Esta documentación está organizada por temas para facilitar la navegación.

## 🚀 Empezar Rápido

| Documento | Descripción | Tiempo |
|-----------|-------------|--------|
| [QUICKSTART.md](../QUICKSTART.md) | Guía de inicio en 3 pasos | 5 min |
| [SETUP.md](#setup) | Instalación y configuración detallada | 15 min |
| [TROUBLESHOOTING.md](#troubleshooting) | Solución de problemas comunes | 10 min |

## 📖 Documentación Principal

### Arquitectura & Diseño
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Descripción general de la arquitectura SOA
  - Diagramas de componentes
  - Patrones de comunicación
  - Flujo de datos
  - Decisiones de diseño

### Servicios
- **[SERVICES.md](./SERVICES.md)** - Documentación de cada microservicio
  - Reminder Service (Puerto 3000)
  - Auth Service (Puerto 3001)
  - Notification Service (Puerto 3002)
  - Endpoints, schemas, y ejemplos

### APIs & Integración
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Guía completa de APIs
  - Especificaciones OpenAPI
  - Ejemplos de uso con curl/Postman
  - Autenticación y seguridad
  - Observabilidad

- **[API_ENDPOINTS.md](./API_ENDPOINTS.md)** - Referencia rápida de endpoints
  - Tabla de rutas por servicio
  - Códigos de respuesta
  - Ejemplos curl

### Infraestructura & DevOps
- **[DOCKER_SETUP.md](./DOCKER_SETUP.md)** - Configuración Docker & Docker Compose
  - Build y deployment
  - Volúmenes y networking
  - Servicios incluidos (PostgreSQL, RabbitMQ, etc.)

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Guía de despliegue
  - Ambientes (desarrollo, staging, producción)
  - CI/CD pipeline
  - Checklist de despliegue

### Monitoreo & Observabilidad
- **[MONITORING.md](./MONITORING.md)** - Setup de monitoreo
  - Prometheus métricas
  - Jaeger tracing distribuido
  - OpenTelemetry instrumentación
  - Alertas y dashboards

### Guías de Desarrollo
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Guía para desarrolladores
  - Configuración del ambiente
  - Workflow de desarrollo
  - Standards de código
  - Testing

- **[CONTRIBUTING.md](../CONTRIBUTING.md) - Guía de contribución
  - Cómo contribuir
  - Convenciones de git
  - Pull request process

## 🔧 Guías Específicas

### Autenticación & Seguridad
- **[AUTH_SETUP.md](./AUTH_SETUP.md)** - Configuración de OAuth2/OIDC
  - Proveedores soportados
  - Configuración de credenciales
  - JWT tokens

### Firebase & Notificaciones
- **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)** - Integración con Firebase Cloud Messaging
  - Creación de proyecto
  - Configuración de credenciales
  - Testing de notificaciones

### Base de Datos
- **[DATABASE.md](./DATABASE.md)** - Schema y gestión de BD
  - Migraciones
  - Schemas iniciales
  - Backup & recovery

## 📊 Referencias & FAQs

- **[GLOSSARY.md](./GLOSSARY.md)** - Glosario de términos
- **[FAQ.md](./FAQ.md)** - Preguntas frecuentes
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Problemas comunes y soluciones
- **[PERFORMANCE.md](./PERFORMANCE.md)** - Optimización y benchmarks

## 📋 Tablas de Contenido Rápidas

### Por Rol

**👨‍💻 Desarrollador**
1. [QUICKSTART.md](../QUICKSTART.md) - Empezar
2. [DEVELOPMENT.md](./DEVELOPMENT.md) - Setup
3. [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - APIs
4. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Problemas

**🏗️ DevOps/Infrastructure**
1. [ARCHITECTURE.md](./ARCHITECTURE.md) - Overview
2. [DOCKER_SETUP.md](./DOCKER_SETUP.md) - Containers
3. [DEPLOYMENT.md](./DEPLOYMENT.md) - Despliegue
4. [MONITORING.md](./MONITORING.md) - Observabilidad

**📊 Project Manager**
1. [ARCHITECTURE.md](./ARCHITECTURE.md) - Visión general
2. [DEPLOYMENT.md](./DEPLOYMENT.md) - Releases
3. [PERFORMANCE.md](./PERFORMANCE.md) - Métricas

### Por Tópico

**Empezar a Usar**
- QUICKSTART.md
- SETUP.md
- DEVELOPMENT.md

**Entender el Sistema**
- ARCHITECTURE.md
- SERVICES.md
- API_DOCUMENTATION.md

**Desplegar**
- DOCKER_SETUP.md
- DEPLOYMENT.md
- MONITORING.md

**Solucionar Problemas**
- TROUBLESHOOTING.md
- FAQ.md
- PERFORMANCE.md

## 🔗 Links Útiles

### Herramientas Online
- [Swagger Editor](https://editor.swagger.io) - Editar OpenAPI specs
- [Draw.io](https://draw.io) - Crear diagramas
- [JSON Schema Validator](https://www.jsonschemavalidator.net/) - Validar schemas

### Documentación Externa
- [OpenAPI 3.0 Specification](https://spec.openapis.org/oas/v3.0.3)
- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)

## 📞 Soporte

- **Issues**: Abrir issue en GitHub
- **Discussions**: Discusiones en GitHub
- **Email**: equipo@unisalle.edu.co
- **Slack**: #phase-3-soa

## 📈 Versión & Cambios

**Última Actualización**: 11 de Noviembre, 2025
**Versión**: 1.0.0
**Rama**: feat/auth-service

### Últimos Cambios
- ✅ Reorganización completa de documentación
- ✅ Auth Service con Swagger UI funcional
- ✅ Todos los servicios corriendo (Docker)
- ✅ OpenAPI 3.0 documentación para todos los servicios
- ✅ Setup de OpenTelemetry y observabilidad

---

**Nota**: Esta documentación se actualiza frecuentemente. Por favor consulta la rama `main` para la versión más reciente.
