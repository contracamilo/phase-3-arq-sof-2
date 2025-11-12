# 🏗️ Arquitectura del Sistema - SOA Architecture Platform

## Visión General

La **SOA Architecture Platform** es una plataforma de microservicios académica que implementa una arquitectura orientada a servicios (SOA) para la gestión de recordatorios académicos.

## 🎯 Principios Arquitectónicos

### Arquitectura Orientada a Servicios (SOA)
- **Desacoplamiento**: Servicios independientes con contratos bien definidos
- **Reutilización**: Servicios pueden ser consumidos por múltiples clientes
- **Interoperabilidad**: Comunicación estandarizada entre servicios

### Microservicios
- **Responsabilidad Única**: Cada servicio tiene un dominio de negocio específico
- **Despliegue Independiente**: Servicios pueden desplegarse y escalarse individualmente
- **Base de Datos por Servicio**: Cada servicio gestiona su propio esquema de datos

### Observabilidad
- **Trazabilidad Distribuida**: Seguimiento de requests a través de múltiples servicios
- **Métricas de Negocio**: KPIs específicos del dominio académico
- **Monitoreo Centralizado**: Dashboards unificados para toda la plataforma

## 🏛️ Arquitectura General

```
SOA Architecture Platform
├── Capa de Presentación
│   ├── API Gateway (Futuro)
│   ├── Swagger UI (Documentación)
│   └── Health Checks
├── Capa de Servicios
│   ├── Reminder Service (Puerto 3000)
│   ├── Auth Service (Puerto 3001)
│   └── Notification Service (Puerto 3002)
├── Capa de Integración
│   ├── PostgreSQL (Base de datos)
│   ├── RabbitMQ (Message broker)
│   └── Keycloak (Identity provider)
└── Capa de Observabilidad
    ├── Prometheus (Métricas)
    ├── Grafana (Dashboards)
    └── Jaeger (Trazabilidad)
```

## 📦 Servicios del Sistema

### Reminder Service (Puerto 3000)
**Responsabilidad**: Gestión completa del ciclo de vida de recordatorios académicos

**Funcionalidades**:
- CRUD operations para recordatorios
- Validación de idempotencia
- Integración con notificaciones
- Health checks y métricas

**Tecnologías**:
- Node.js + TypeScript
- Express.js
- PostgreSQL (esquema dedicado)
- RabbitMQ (publicación de eventos)
- OpenTelemetry (observabilidad)

### Auth Service (Puerto 3001)
**Responsabilidad**: Autenticación y autorización usando OIDC

**Funcionalidades**:
- Flujo de autenticación OIDC con Keycloak
- Gestión de tokens JWT
- Validación de usuarios
- Información de usuario autenticado

**Tecnologías**:
- Node.js + TypeScript
- Express.js
- Keycloak (OIDC Provider)
- PostgreSQL (almacenamiento de sesiones)
- OpenTelemetry (observabilidad)

### Notification Service (Puerto 3002)
**Responsabilidad**: Gestión de plantillas y envío de notificaciones push

**Funcionalidades**:
- CRUD operations para plantillas de notificación
- Renderizado de plantillas con datos dinámicos
- Envío de notificaciones push via Firebase
- Procesamiento asíncrono de colas

**Tecnologías**:
- Node.js + TypeScript
- Express.js
- Firebase Cloud Messaging
- RabbitMQ (consumo de eventos)
- OpenTelemetry (observabilidad)

## 🔗 Comunicación Entre Servicios

### Patrón de Comunicación
```
Reminder Service → RabbitMQ → Notification Service
       ↓
   PostgreSQL
       ↓
   Auth Service → Keycloak
```

### Message Broker (RabbitMQ)
- **Protocolo**: AMQP 0-9-1
- **Exchange Type**: Direct Exchange
- **Routing Keys**: `reminder.created`, `reminder.updated`, `reminder.deleted`
- **Queues**: `notification-queue` (consumida por Notification Service)

## 💾 Arquitectura de Datos

### Base de Datos por Servicio
```
PostgreSQL Instance
├── reminders_db
│   ├── reminder_service_schema
│   │   ├── reminders table
│   │   ├── reminder_logs table
│   │   └── idempotency_keys table
│   ├── auth_service_schema
│   │   ├── user_sessions table
│   │   └── auth_tokens table
│   └── keycloak_schema
│       ├── users table
│       ├── realms table
│       └── clients table
```

## 🔐 Seguridad

### Autenticación y Autorización
- **Protocolo**: OpenID Connect (OIDC)
- **Provider**: Keycloak
- **Flujo**: Authorization Code Flow
- **Tokens**: JWT con claims personalizados

### Seguridad de API
- **CORS**: Configurado para orígenes permitidos
- **Helmet**: Headers de seguridad HTTP
- **Rate Limiting**: Protección contra abuso
- **Input Validation**: Sanitización y validación de datos

## 📊 Observabilidad

### OpenTelemetry Instrumentation
- **Tracing**: Trazas distribuidas con Jaeger
- **Metrics**: Métricas de negocio y sistema con Prometheus
- **Logs**: Logs estructurados con Winston

### Métricas de Negocio
- **Reminder Service**: `reminders_created_total`, `idempotency_conflicts_total`
- **Auth Service**: `auth_logins_initiated_total`, `auth_logins_successful_total`
- **Notification Service**: `notification_templates_created_total`, `notification_templates_rendered_total`

### Dashboards
- **Grafana**: Visualización de métricas y KPIs
- **Prometheus**: Almacenamiento y consulta de métricas
- **Jaeger UI**: Visualización de trazas distribuidas

## 🚀 Despliegue y Escalabilidad

### Contenedorización
- **Docker**: Todos los servicios están contenerizados
- **Docker Compose**: Orquestación local de servicios
- **Multi-stage Builds**: Optimización de imágenes

### Escalabilidad
- **Horizontal**: Servicios pueden escalarse independientemente
- **Vertical**: Configuración de recursos por contenedor
- **Load Balancing**: API Gateway distribuirá carga (futuro)

## 📋 Decisiones Arquitectónicas

### Por Qué SOA/Microservicios
- **Escalabilidad**: Servicios pueden escalarse independientemente
- **Mantenibilidad**: Equipos pueden trabajar en servicios separados
- **Tecnología**: Cada servicio puede usar la tecnología más apropiada
- **Resiliencia**: Falla de un servicio no afecta a otros

### Por Qué PostgreSQL
- **ACID**: Garantías de consistencia para datos críticos
- **JSONB**: Flexibilidad para datos semi-estructurados
- **Extensions**: Funcionalidades avanzadas disponibles

### Por Qué RabbitMQ
- **AMQP**: Protocolo estándar y maduro
- **Reliability**: Garantías de entrega de mensajes
- **Flexibility**: Múltiples patrones de mensajería

### Por Qué Keycloak
- **Estándares**: OIDC/OAuth2 compliance
- **Features**: Autenticación social, MFA, etc.
- **Integration**: Buena integración con aplicaciones

### Por Qué OpenTelemetry
- **Vendor Neutral**: No lock-in a proveedores específicos
- **Standards**: Siguiendo estándares abiertos
- **Ecosystem**: Amplio soporte en la comunidad

---

**📖 Documentación Relacionada**
- [Guía de Inicio](getting-started.md) - Cómo ejecutar la plataforma
- [Documentación de Servicios](services/) - Detalles específicos de cada servicio
- [Testing](testing.md) - Estrategia de testing completa
- [Despliegue](deployment.md) - Procedimientos de producción