# 📋 Plan Maestro de Implementación - Fase 3 MVP

**Fecha:** Noviembre 11, 2025  
**Estado:** En Planificación  
**Equipo:** Universidad Unisalle - Arquitectura de Software  

---

## 1. Resumen Ejecutivo

Este documento define la **hoja de ruta completa** para implementar los **4 bloques funcionales faltantes** del MVP de **AI Companion Unisalle**:

1. **Bloque de Identidad** (Auth/SSO + Perfil)
2. **Bloque de Core** (Calendario + Integración LMS)
3. **Bloque de Inteligencia** (MCP Context + Recomendaciones/IA)
4. **Servicios Transversales** (Observabilidad, Despliegue)

Cada servicio seguirá los principios SOA de:
- ✅ **Bajo acoplamiento** mediante interfaces REST/AsyncAPI bien definidas
- ✅ **Reutilización** con patrones de composición entre servicios
- ✅ **Contrato formal** usando OpenAPI 3.0 + JSON Schema
- ✅ **Seguridad** con OAuth2/OIDC + cifrado en reposo
- ✅ **Observabilidad** mediante OpenTelemetry + Prometheus/Grafana

---

## 2. Estado Actual (Baseline)

### ✅ Ya Implementado

```
Servicio de Recordatorios
├── Modelo de dominio completo
├── CRUD REST API (OpenAPI 3.1)
├── PostgreSQL con esquema
├── RabbitMQ Publisher (eventos)
├── Camunda 8 BPMN (orquestación)
├── Middleware (idempotencia, errores)
├── OpenTelemetry (instrumentación)
├── Docker Compose (7 servicios)
└── Pruebas unitarias & componente

Servicio de Notificaciones
├── RabbitMQ Consumer
├── Firebase Cloud Messaging (FCM)
├── APNs (Apple Push Notification)
└── Manejo de retintos y DLQ
```

### ❌ Pendiente de Implementar

```
Bloque de Identidad
├── Auth/SSO (OIDC + JWT)
├── Perfil (userinfo endpoint)
└── RBAC/OAuth2 en WSO2

Bloque de Core
├── Calendario (sincronización iCal/ICS)
├── Integración LMS (ACL + Apache Camel)
└── Transformación de eventos

Bloque de Inteligencia
├── MCP Context (fuente de verdad)
├── Recomendaciones (orquestación IA)
└── Trazabilidad de accesos

Servicios Transversales
├── Documentación OpenAPI por servicio
├── Pruebas de integración (end-to-end)
├── Dashboards Grafana/Prometheus
└── Guías de despliegue
```

---

## 3. Arquitectura Detallada

### 3.1 Bloque de Identidad (Auth/SSO + Perfil)

#### Flujo de Autenticación OIDC

```
┌──────────────┐
│  Frontend    │
│  (Cliente)   │
└──────┬───────┘
       │ 1. redirect to /authorize
       ▼
┌──────────────────┐     ┌──────────────────┐
│  WSO2 API        │─────→  IdP Institucional│
│  Manager         │     │  (Okta/Azure AD) │
│  (Gateway)       │◄─────│  OIDC Provider   │
└──────┬───────────┘     └──────────────────┘
       │ 2. auth_code + state
       │
       │ 3. exchange code for token
       ▼
┌──────────────────┐     
│  Auth Service    │─────→ Validar JWT
│  (Puerto 3001)   │      Generar refresh token
│  - POST /token   │      
│  - GET /userinfo │
└──────┬───────────┘
       │ 4. JWT + Refresh Token
       ▼
┌──────────────┐
│  Frontend    │ (guardado en secure cookies)
└──────────────┘

Composición con Perfil:
└─→ GET /profile (consume /userinfo del Auth)
    └─→ Devuelve: {sub, email, roles, attributes}
```

#### Especificación OpenAPI - Auth Service

```yaml
POST /auth/token
  - Parámetros: code, state, grant_type, redirect_uri
  - Respuesta: {access_token, refresh_token, expires_in}
  - SLA: P95 < 300ms, disponibilidad > 99.9%

GET /auth/userinfo
  - Headers: Authorization: Bearer {token}
  - Respuesta: {sub, email, name, roles}
  - Seguridad: JWT validation, CORS policy

POST /auth/refresh
  - Parámetros: refresh_token
  - Respuesta: {access_token, expires_in}
```

#### Especificación OpenAPI - Profile Service

```yaml
GET /profile
  - Headers: Authorization: Bearer {token}
  - Respuesta: {id, email, roles, department, attributes}
  - SLA: P95 < 150ms

PATCH /profile
  - Cuerpo: {name, preferences, attributes}
  - Seguridad: Solo autorizado para user_id actual

GET /profile/roles
  - Respuesta: {roles: [{id, name, permissions}]}
  - Caché: Redis 1 hora
```

---

### 3.2 Bloque de Core (Calendario + Integración LMS)

#### Calendario Service

**Fuentes de Datos:**
- iCal/ICS (eventos institucionales)
- LMS API (fechas de entregas/exámenes)
- Calendario personal del usuario

**Flujo de Sincronización:**

```
┌─────────────────────────┐
│  Calendario Service     │
│  (Scheduled Sync Job)   │
└──────────┬──────────────┘
           │ cada 5 minutos
           ▼
┌──────────────────────────────┐
│  Fetch eventos:              │
│  1. Universidad iCal/ICS      │
│  2. LMS REST API (tareas)     │
│  3. Cache local (Redis)       │
└──────────┬───────────────────┘
           │ transformar + deduplicar
           ▼
┌──────────────────────────────┐
│  Validar cambios             │
│  - Comparar versión          │
│  - Detectar inserciones      │
│  - Detectar actualizaciones  │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  Publicar eventos RabbitMQ:  │
│  - calendar_event_created    │
│  - calendar_event_updated    │
│  - calendar_event_deleted    │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  Consumidores:               │
│  - Recordatorios Service     │
│  - Notificaciones Service    │
└──────────────────────────────┘

SLA: Desfase máximo 5 minutos, reintento con backoff exponencial
```

**Especificación OpenAPI - Calendario Service**

```yaml
GET /calendar/events
  - Query: userId, startDate, endDate, category
  - Respuesta: {events: [{id, title, start, end, source, metadata}]}
  - SLA: P95 < 200ms

POST /calendar/events
  - Cuerpo: {title, start, end, description, source}
  - Respuesta: {id, title, ...}
  - Creador: Manual o desde LMS/ACL

GET /calendar/sync-status
  - Respuesta: {lastSync, nextSync, status, errors}
  - Métricas: lag, successRate, errorCount
```

#### Integración LMS (Anti-Corruption Layer)

**Patrón ACL con Apache Camel:**

```
┌──────────────────┐
│  Legacy LMS      │
│  (Blackboard/    │
│   Canvas/Moodle) │
└────────┬─────────┘
         │ REST/SOAP/LDAP
         │ (acoplamiento alto)
         ▼
┌──────────────────────────────┐
│  Apache Camel ACL            │
│  ┌────────────────────────┐  │
│  │ 1. Fetch tareas        │  │
│  │ 2. Transform campos    │  │
│  │ 3. Enriquecer datos    │  │
│  │ 4. Validar reglas      │  │
│  │ 5. Mappear a DTOs      │  │
│  └────────────────────────┘  │
└────────┬─────────────────────┘
         │ (acoplamiento bajo)
         ▼
┌──────────────────────────────┐
│  Servicios Internos (SOA)    │
│  - Calendario               │
│  - Recordatorios            │
│  - Recomendaciones          │
└──────────────────────────────┘

EIP Patterns:
- Message Router (por tipo de evento)
- Transformer (LMS format → internal format)
- Enricher (agregar datos del usuario)
- Splitter (tareas individuales)
- Aggregate (lotes de eventos)
```

---

### 3.3 Bloque de Inteligencia (MCP Context + Recomendaciones)

#### MCP Context Service

**Responsabilidades:**
- Centralizar conocimiento institucional (guardianes de datos)
- Trazabilidad de accesos (quién accede a qué información)
- Cifrado de información sensible
- Control de contexto para modelos IA

**Fuentes de Datos:**
- Perfil del usuario (Auth Service)
- Calendario (eventos)
- Recordatorios (historial de cumplimiento)
- Calificaciones (LMS)
- Comportamiento (analytics)

**Especificación OpenAPI - MCP Context Service**

```yaml
GET /mcp/context/{userId}
  - Headers: Authorization: Bearer {token}
  - Respuesta: {
      user: {id, email, roles},
      calendar: {events: [...], nextDueDate},
      reminders: {pending: N, completed: M, successRate},
      academic: {courses, gpa, schedule},
      behavior: {studyPattern, engagementScore},
      metadata: {lastUpdated, sources: []}
    }
  - Auditoria: LOG access con timestamp, usuario, propósito
  - Seguridad: Cifrado en reposo (AES-256)
  - SLA: P95 < 500ms

POST /mcp/context/trace
  - Cuerpo: {userId, action, resource, timestamp}
  - Propósito: Auditoria y trazabilidad
  - Retencion: 1 año (cumplimiento regulatorio)

GET /mcp/context/{userId}/sensitive
  - RBAC: Solo admin o Data Protection Officer
  - Respuesta: Datos sensibles (cifrados)
  - Propósito: Gobernanza de datos
```

#### Recomendaciones Service (Orquestador IA)

**Flujo de Generación:**

```
┌──────────────────────────┐
│  Trigger (evento)        │
│  - Recordatorio cumplido │
│  - Calendario actualizado│
│  - Sesión iniciada       │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  1. Fetch MCP Context        │
│     (GET /mcp/context/{uid}) │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  2. Aplicar reglas de negocio│
│     - Filtrar por rol        │
│     - Considerar horarios    │
│     - Verificar preferencias │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  3. Invocar modelo IA        │
│     (LLM / ML model)         │
│     Input: contexto relevante│
│     Output: recomendaciones  │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  4. Rank & Filter            │
│     - Confidence > 0.7       │
│     - Diversidad de tipos    │
│     - Top 3 recomendaciones  │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  5. Persistir & Publicar     │
│     - Guardar en DB          │
│     - Publicar a RabbitMQ    │
│     - Logs + Trazas          │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Consumidores:               │
│  - Frontend (notificaciones) │
│  - Recordatorios Service     │
│  - Analytics Service         │
└──────────────────────────────┘

MLOps (Future Phase):
- Versionado de modelos
- A/B testing
- Drift detection
- Reentrenamiento automático
```

**Especificación OpenAPI - Recomendaciones Service**

```yaml
GET /recommendations/{userId}
  - Query: category, limit, language
  - Respuesta: {
      recommendations: [{
        id, title, description, category,
        reasoning, confidence, source,
        action_url, expires_at
      }],
      metadata: {generatedAt, version}
    }
  - SLA: P95 < 1s

POST /recommendations/{userId}/feedback
  - Cuerpo: {recommendationId, feedback: 'helpful'|'not_helpful'|'dismissed'}
  - Propósito: Mejorar modelo IA
  - Respuesta: {acknowledged: true}

GET /recommendations/analytics
  - Query: userId, dateRange, category
  - Respuesta: {stats: {totalGenerated, accepted, rejected, avgConfidence}}
```

---

## 4. Estructura de Carpetas y Archivos

```
/Users/home/Documents/universidad/phase-3-arq-sof-2/
│
├── src/                           (Servicio Recordatorios - existente)
│   ├── __tests__/
│   ├── config/
│   ├── instrumentation/
│   ├── integration/
│   ├── middleware/
│   ├── models/
│   ├── repositories/
│   ├── routes/
│   ├── services/
│   └── utils/
│
├── auth-service/                  (NEW: Bloque Identidad)
│   ├── src/
│   │   ├── __tests__/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── app.ts
│   │   └── index.ts
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── profile-service/               (NEW: Bloque Identidad)
│   ├── src/
│   │   ├── __tests__/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── services/
│   │   ├── app.ts
│   │   └── index.ts
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── calendar-service/              (NEW: Bloque Core)
│   ├── src/
│   │   ├── __tests__/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── services/
│   │   ├── tasks/                 (Sincronización)
│   │   ├── app.ts
│   │   └── index.ts
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── lms-integration-acl/           (NEW: Bloque Core)
│   ├── src/
│   │   ├── __tests__/
│   │   ├── routes/                (Apache Camel XML)
│   │   ├── transformers/
│   │   ├── services/
│   │   ├── app.ts
│   │   └── index.ts
│   ├── camel/                     (Apache Camel configs)
│   │   ├── lms-routes.xml
│   │   ├── transformers.xml
│   │   └── eip-patterns.xml
│   ├── Dockerfile
│   ├── pom.xml / package.json
│   └── .env.example
│
├── mcp-context-service/           (NEW: Bloque Inteligencia)
│   ├── src/
│   │   ├── __tests__/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── services/
│   │   ├── crypto/                (Cifrado)
│   │   ├── audit/                 (Trazabilidad)
│   │   ├── app.ts
│   │   └── index.ts
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── recommendations-service/       (NEW: Bloque Inteligencia)
│   ├── src/
│   │   ├── __tests__/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── services/
│   │   ├── engines/               (IA/ML)
│   │   ├── app.ts
│   │   └── index.ts
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── notification-service/          (Existente)
│   ├── src/
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── observability/                 (NEW: Dashboards)
│   ├── prometheus.yml             (existente)
│   ├── grafana/
│   │   ├── dashboards/
│   │   │   ├── auth-service.json
│   │   │   ├── calendar-service.json
│   │   │   ├── lms-integration.json
│   │   │   ├── mcp-context.json
│   │   │   └── recommendations.json
│   │   └── provisioning/
│   │       └── datasources.yaml
│   └── alerts.yaml
│
├── soa-integration/               (Existente + expansión)
│   ├── camunda/
│   │   ├── reminder-process.bpmn
│   │   ├── calendar-sync-process.bpmn    (NEW)
│   │   ├── recommendation-generation.bpmn (NEW)
│   │   └── worker.ts
│   ├── camel/
│   │   ├── acl-routes.xml         (existente)
│   │   ├── lms-transformer.xml    (NEW)
│   │   └── calendar-routes.xml    (NEW)
│   ├── wso2/
│   │   ├── api-config.json        (actualizado)
│   │   ├── policies.xml           (actualizado)
│   │   └── api-definitions/
│   │       ├── auth-api.yaml
│   │       ├── profile-api.yaml
│   │       ├── calendar-api.yaml
│   │       └── ...
│   └── kubernetes/                (K8s manifests - opcional)
│       ├── auth-service.yaml
│       ├── services.yaml
│       └── ingress.yaml
│
├── docs/                          (Documentación)
│   ├── PHASE3_IMPLEMENTATION_PLAN.md (este archivo)
│   ├── ARCHITECTURE.md
│   ├── API_CONTRACTS.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── MONITORING_GUIDE.md
│   ├── SECURITY_GUIDE.md
│   └── services/
│       ├── auth-service-README.md
│       ├── profile-service-README.md
│       ├── calendar-service-README.md
│       ├── lms-integration-README.md
│       ├── mcp-context-README.md
│       └── recommendations-README.md
│
├── docker-compose.yml             (actualizado)
├── package.json                   (workspace root)
├── tsconfig.json                  (workspace root)
├── jest.config.js                 (actualizado)
└── .gitignore
```

---

## 5. Timeline y Fases

### Fase 1: Bloque de Identidad (2-3 semanas)
- [ ] Auth Service (OIDC integration)
- [ ] Profile Service (userinfo + RBAC)
- [ ] Pruebas unitarias & integración
- [ ] OpenAPI specs
- [ ] Dockerfiles y docker-compose

### Fase 2: Bloque de Core (2-3 semanas)
- [ ] Calendario Service (sincronización)
- [ ] ACL LMS + Apache Camel
- [ ] Pruebas & composición con Recordatorios
- [ ] BPMN para eventos de calendario
- [ ] Documentación

### Fase 3: Bloque de Inteligencia (2-3 semanas)
- [ ] MCP Context Service
- [ ] Recommendations Service
- [ ] Pruebas e integración
- [ ] Esquema MLOps (foundation)

### Fase 4: Observabilidad y Despliegue (1-2 semanas)
- [ ] Dashboards Grafana
- [ ] Alertas Prometheus
- [ ] Guías de despliegue
- [ ] Pruebas E2E y composición completa
- [ ] Informe final

---

## 6. Criterios de Aceptación

### Por cada Servicio

```
✅ Código fuente implementado
✅ Especificación OpenAPI 3.0 completa
✅ Pruebas unitarias (>80% cobertura)
✅ Pruebas de integración
✅ Dockerfile multi-etapa
✅ Variables de entorno (.env.example)
✅ Documentación README
✅ Integración en docker-compose.yml
✅ Instrumentación OpenTelemetry
✅ SLIs/SLOs definidos
```

### Por Composición de Servicios

```
✅ Calendario + Recordatorios (crear reminders desde eventos)
✅ Auth + Perfil + MCP Context (obtener contexto autorizado)
✅ Calendario + LMS + Recordatorios (sincronizar tareas)
✅ MCP Context + Recomendaciones (generar sugerencias)
✅ Flujo E2E: Usuario login → Ver calendario → Recibir notificación
```

### SLOs Globales

```
- Disponibilidad: > 99.9%
- P95 Latencia API: < 500ms
- Tasa error: < 0.1%
- Desfase sincronización: ≤ 5 min
- Cobertura tests: > 80%
```

---

## 7. Dependencias Externas

| Sistema | Propósito | Alternativas |
|---------|-----------|--------------|
| **IdP (OIDC)** | Autenticación institucional | Okta, Azure AD, Keycloak |
| **LMS** | Tareas y eventos académicos | Blackboard, Canvas, Moodle |
| **Calendario** | iCal/ICS institucional | Google Calendar API, Office 365 |
| **Base de Datos** | Persistencia | PostgreSQL (actual) |
| **Message Broker** | Eventos async | RabbitMQ (actual) |
| **Orquestación** | BPMN workflows | Camunda 8 (actual) |
| **API Gateway** | Enrutamiento, OAuth2 | WSO2 (actual) |
| **Observabilidad** | Trazas/métricas | Jaeger, Prometheus (actual) |
| **IA/ML** | Generación recomendaciones | OpenAI, Anthropic, LLaMA |

---

## 8. Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|--------|-----------|
| Retrasos IdP | Media | Alto | Usar Keycloak como fallback dev |
| Integración LMS compleja | Alta | Alto | Implementar mock LMS early |
| Performance MCP Context | Media | Medio | Usar Redis cache, indexar BD |
| Complejidad IA/Recomendaciones | Alta | Medio | MVP con reglas, LLM en Fase 4 |
| Sincronización calendario | Media | Medio | Deduplicación, versionado de eventos |

---

## 9. Métricas de Éxito

### Técnicas

- ✅ 100% servicios desplegados
- ✅ >80% cobertura de tests
- ✅ Latencia P95 < 500ms
- ✅ Disponibilidad > 99.9%
- ✅ 0 vulnerabilidades críticas (OWASP Top 10)

### Funcionales

- ✅ Usuario puede autenticarse con OIDC
- ✅ Calendario sincroniza eventos en < 5 min
- ✅ Recordatorios se crean automáticamente desde calendario
- ✅ Recomendaciones se generan según contexto del usuario
- ✅ Composición de servicios funciona E2E

### Organizacionales

- ✅ Documentación completa por servicio
- ✅ Equipo capacitado en arquitectura SOA
- ✅ Plataforma lista para producc(ión
- ✅ Monitoreo activo de SLOs

---

## 10. Próximos Pasos (Inmediatos)

1. **Revisar y aprobar** este plan con el equipo
2. **Crear repositorio** para cada nuevo servicio
3. **Configurar CI/CD** (GitHub Actions)
4. **Implementar Auth Service** (tarea prioritaria)
5. **Paralelizar** tareas de Core e Inteligencia
6. **Establecer** daily standups y sprints de 2 semanas

---

**Documento preparado para:**
- Revisión arquitectónica
- Asignación de recursos
- Planificación de sprints
- Seguimiento de progreso

