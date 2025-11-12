# SOA Architecture Platform AI companion

Una plataforma de arquitectura orientada a servicios (SOA) para gestión académica universitaria, implementada con Node.js, TypeScript, PostgreSQL, RabbitMQ y Keycloak.

## 📖 Documentación

- **[🚀 Guía de Inicio](docs/getting-started.md)** - Instalaciones, contenedores, servicios, Swagger, testing y métricas
- **[🏗️ Arquitectura](docs/architecture.md)** - Diseño del sistema y decisiones técnicas
- **[🧪 Testing](docs/testing.md)** - Estrategia completa de testing y ejecución
- **[🚀 Despliegue](docs/deployment.md)** - Procedimientos de producción y nube

## ⚡ Inicio Rápido

¿Quieres empezar inmediatamente? Consulta nuestra **[Guía de Inicio](docs/getting-started.md)** para ejecutar la plataforma completa en menos de 5 minutos.

```bash
git clone <repository-url>
cd phase-3-arq-sof-2
docker compose -f infrastructure/docker/docker-compose.yml up -d --build
./scripts/health-check.sh
```

## 🏗️ Arquitectura General

```text
SOA Architecture Platform
├── Reminder Service (Puerto 3000) - Gestión de recordatorios
├── Auth Service (Puerto 3001) - Autenticación OIDC
├── Notification Service (Puerto 3002) - Notificaciones push
├── Keycloak (Puerto 8080) - Proveedor de identidad
├── PostgreSQL - Base de datos
├── RabbitMQ - Message broker
├── Prometheus (Puerto 9090) - Métricas
├── Grafana (Puerto 3003) - Dashboards
└── Jaeger (Puerto 16686) - Trazabilidad
```

## 🎯 Características Principales

- ✅ **Arquitectura SOA**: Servicios desacoplados con responsabilidades claras
- ✅ **Autenticación OIDC**: Keycloak para gestión de identidad
- ✅ **Mensajería Asíncrona**: RabbitMQ para comunicación entre servicios
- ✅ **Observabilidad Completa**: Métricas, trazas y dashboards
- ✅ **Testing Integral**: Unit, integration y E2E tests
- ✅ **Contenedorización**: Docker para despliegue consistente
- ✅ **Documentación API**: Swagger/OpenAPI para todas las APIs

## 📊 Métricas de Negocio

La plataforma expone métricas de negocio en tiempo real:

- **Reminder Service**: `reminders_created_total`, `idempotency_conflicts_total`
- **Auth Service**: `auth_logins_initiated_total`, `auth_logins_successful_total`
- **Notification Service**: `notification_templates_created_total`, `notification_templates_rendered_total`

## 🔗 Enlaces Útiles

- **📡 APIs**:
  - [Reminder Service](http://localhost:3000/api-docs)
  - [Auth Service](http://localhost:3001/api-docs)
  - [Notification Service](http://localhost:3002/api-docs)

- **� Monitoreo**:
  - [Grafana Dashboards](http://localhost:3003)
  - [Prometheus Metrics](http://localhost:9090)
  - [Jaeger Traces](http://localhost:16686)

- **🔧 Herramientas**:
  - [RabbitMQ Management](http://localhost:15672)
  - [Keycloak Admin](http://localhost:8080)

## 🤝 Contribución

1. Consulta la [documentación completa](docs/) para entender la arquitectura
2. Ejecuta los tests: `npm test`
3. Sigue las guías de [despliegue](docs/deployment.md) para desarrollo local
4. Abre un Pull Request con tus mejoras

## 📝 Licencia

Este proyecto está bajo la Licencia MIT.

---

**🎓 Proyecto Académico** - Arquitectura de Software 2 - Universidad

