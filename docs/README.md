# 📚 Documentación SOA Architecture Platform

Bienvenido a la documentación completa de la **SOA Architecture Platform**, una plataforma de arquitectura orientada a servicios para gestión académica universitaria.

## 🎯 Información General

Esta plataforma implementa una arquitectura de microservicios moderna utilizando Node.js, TypeScript, PostgreSQL, RabbitMQ y Keycloak para proporcionar servicios de gestión de recordatorios, autenticación y notificaciones.

### 🚀 Inicio Rápido

¿Quieres empezar inmediatamente? Consulta nuestra **[Guía de Inicio Rápido](getting-started.md)** para tener la plataforma funcionando en menos de 5 minutos.

```bash
git clone <repository-url>
cd phase-3-arq-sof-2
docker compose -f infrastructure/docker/docker-compose.yml up -d --build
./scripts/health-check.sh
```

## 📖 Documentación

### 🏗️ Arquitectura del Sistema

- **[Arquitectura General](architecture.md)** - Visión general de la arquitectura SOA
- **[Servicios](services/)** - Documentación detallada de cada microservicio
  - [Auth Service](services/auth-service.md) - Autenticación y autorización
  - [Notification Service](services/notification-service.md) - Gestión de notificaciones
  - [Reminder Service](services/reminder-service.md) - Gestión de recordatorios

### 🚀 Guías de Ejecución

- **[Cómo Ejecutar el Proyecto](getting-started.md)** - Instalaciones, contenedores, servicios
- **[Testing](testing.md)** - Guías de testing unitario e integración
- **[Monitoreo y Métricas](monitoring.md)** - Observabilidad y métricas de negocio

### 🚀 Despliegue

- **[Deployment](deployment.md)** - Procedimientos de despliegue en producción

## 🏛️ Arquitectura de Alto Nivel

```ascii
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Auth Service  │    │ Reminder Service│    │Notification    │
│     (Port 3001) │◄──►│    (Port 3000)  │◄──►│ Service (3002) │
│                 │    │                 │    │                 │
│ • OIDC Auth     │    │ • CRUD Reminders│    │ • Templates     │
│ • JWT Tokens    │    │ • Idempotency   │    │ • Push/Email    │
│ • User Info     │    │ • PostgreSQL    │    │ • Firebase      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Keycloak      │
                    │   (Port 8080)   │
                    │                 │
                    │ • OIDC Provider │
                    │ • User Mgmt     │
                    │ • SSO           │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐    ┌─────────────────┐
                    │  PostgreSQL     │    │   RabbitMQ      │
                    │   (Port 5432)   │    │  (Port 5672)    │
                    │                 │    │                 │
                    │ • Data Storage  │    │ • Message Queue │
                    │ • ACID          │    │ • Async Comm    │
                    └─────────────────┘    └─────────────────┘
```

## 🛠️ Tecnologías Principales

- **Backend**: Node.js + TypeScript + Express.js
- **Base de Datos**: PostgreSQL
- **Mensajería**: RabbitMQ
- **Autenticación**: Keycloak (OIDC)
- **Notificaciones**: Firebase Cloud Messaging
- **Contenedores**: Docker + Docker Compose
- **Observabilidad**: OpenTelemetry + Prometheus + Grafana + Jaeger

## 📊 Métricas Clave

- **Logins Exitosos**: Ratio de conversión de autenticación
- **Templates Renderizados**: Uso real del sistema de notificaciones
- **Recordatorios Creados**: Actividad principal del negocio
- **Tiempo de Respuesta**: Performance de APIs
- **Tasa de Error**: Fiabilidad del sistema

## 🔗 Enlaces Rápidos

- **API Documentation**: [Swagger UI](http://localhost:3000/api-docs) (Reminder), [Auth](http://localhost:3001/api-docs), [Notification](http://localhost:3002/api-docs)
- **Monitoring**: [Grafana](http://localhost:3003) (admin/admin)
- **Tracing**: [Jaeger](http://localhost:16686)
- **Metrics**: [Prometheus](http://localhost:9090)
- **Message Queue**: [RabbitMQ](http://localhost:15672) (guest/guest)
- **Identity Provider**: [Keycloak](http://localhost:8080) (admin/admin)

## 📞 Soporte

Para preguntas sobre esta documentación o el proyecto:

1. Revisa las **[Guías de Troubleshooting](getting-started.md#troubleshooting)**
2. Consulta los logs: `docker compose logs -f`
3. Verifica el estado de salud: `./scripts/health-check.sh`

## 🤝 Contribución

¡Las contribuciones son bienvenidas! Por favor:

1. Lee las **[guías de desarrollo](getting-started.md#desarrollo-local)**
2. Sigue los estándares de código
3. Agrega tests para nuevas funcionalidades
4. Actualiza la documentación

---

**Última actualización**: Noviembre 2025
**Versión**: 1.0.0
