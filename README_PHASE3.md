# Phase 3: Reminders Service - Implementation, Testing & Maintenance

## 🏗️ Architecture Overview

This project implements a **Reminders Service** following Service-Oriented Architecture (SOA) and Microservices patterns with:

- **API-First Design**: OpenAPI 3.1 specification
- **Test-Driven Development**: Unit, Component, Integration, and E2E tests
- **Low Coupling**: Clear separation of concerns with layered architecture
- **RFC 7807**: Standardized error handling with `application/problem+json`
- **Idempotency**: UUID v4-based idempotency for POST operations
- **Observability**: OpenTelemetry instrumentation with distributed tracing

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Core Service Implementation](#core-service-implementation)
- [SOA Integration](#soa-integration)
- [Testing](#testing)
- [Observability](#observability)
- [API Documentation](#api-documentation)

## 🔧 Prerequisites

### Required Software

- **Docker** (20.10+) & **Docker Compose** (2.0+)
- **Node.js** (18.x or 20.x)
- **npm** (9.x+)
- **PostgreSQL** (15.x) - via Docker
- **RabbitMQ** (3.12+) - via Docker
- **Git** for version control

### Optional (for full SOA integration)

- **WSO2 API Manager** (4.2+) for API gateway
- **Camunda 8** (Zeebe) for orchestration
- **Apache Camel** (4.x) for integration patterns
- **Jaeger** for distributed tracing
- **Prometheus** for metrics

## 🚀 Quick Start

### 1. Clone and Install

```bash
cd /Users/home/Documents/universidad/phase-3-arq-sof-2
npm install
```

### 2. Start Infrastructure

```bash
# Start PostgreSQL, RabbitMQ, and all services
docker-compose up -d

# Check services are healthy
docker-compose ps
```

### 3. Run Migrations

```bash
# Database is auto-initialized via init.sql
# Verify with:
docker-compose exec postgres psql -U postgres -d reminders_db -c "\dt"
```

### 4. Start Development Server

```bash
npm run dev
```

The API will be available at: `http://localhost:3000`

### 5. Verify Installation

```bash
# Health check
curl http://localhost:3000/health

# Create a reminder
curl -X POST http://localhost:3000/v1/reminders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "userId": "user-123",
    "title": "Test reminder",
    "dueAt": "2025-11-15T10:00:00Z",
    "advanceMinutes": 30
  }'
```

## 🏛️ Architecture

### Layered Architecture

```
┌─────────────────────────────────────────────┐
│           API Gateway (WSO2)                │
│  - Rate Limiting                            │
│  - OAuth2/OIDC                              │
│  - CORS                                     │
└─────────────┬───────────────────────────────┘
              │
┌─────────────▼───────────────────────────────┐
│        Reminders Service (Express)          │
│  ┌─────────────────────────────────────┐   │
│  │  Routes (REST API)                  │   │
│  │  - POST /reminders (idempotent)     │   │
│  │  - GET /reminders                   │   │
│  │  - GET /reminders/:id               │   │
│  │  - PATCH /reminders/:id             │   │
│  │  - DELETE /reminders/:id            │   │
│  └──────────┬──────────────────────────┘   │
│             │                               │
│  ┌──────────▼──────────────────────────┐   │
│  │  Middleware                         │   │
│  │  - Idempotency                      │   │
│  │  - RFC 7807 Error Handler           │   │
│  │  - Validation                       │   │
│  │  - OpenTelemetry                    │   │
│  └──────────┬──────────────────────────┘   │
│             │                               │
│  ┌──────────▼──────────────────────────┐   │
│  │  Service Layer (Business Logic)    │   │
│  │  - Validation                       │   │
│  │  - State transitions                │   │
│  │  - Event publishing                 │   │
│  └──────────┬──────────────────────────┘   │
│             │                               │
│  ┌──────────▼──────────────────────────┐   │
│  │  Repository (Data Access)           │   │
│  │  - CRUD operations                  │   │
│  │  - Idempotency storage              │   │
│  └──────────┬──────────────────────────┘   │
│             │                               │
└─────────────┼───────────────────────────────┘
              │
┌─────────────▼───────────────────────────────┐
│          PostgreSQL Database                │
│  - reminders table                          │
│  - idempotency_keys table                   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│         Camunda 8 (Orchestration)           │
│  - BPMN Process                             │
│  - Timer Events                             │
│  - Worker (Zeebe Client)                    │
└─────────────┬───────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│           RabbitMQ (Messaging)              │
│  - reminders.exchange (topic)               │
│  - reminder_due queue                       │
│  - Dead Letter Exchange (retry)             │
└─────────────┬───────────────────────────────┘
              │
┌─────────────▼───────────────────────────────┐
│        Notification Service                 │
│  - RabbitMQ Consumer                        │
│  - FCM/APNs Integration                     │
└─────────────────────────────────────────────┘
```

## 📦 Core Service Implementation

### Domain Model

**File**: `src/models/reminder.model.ts`

Key entities:
- `Reminder`: Main domain entity
- `ReminderStatus`: Enum (pending, scheduled, notified, completed, cancelled)
- `ReminderSource`: Enum (manual, LMS, calendar, external)
- `ReminderValidator`: Business rule validation

### Database Schema

**File**: `init.sql`

Tables:
- `reminders`: Main data storage with JSON metadata
- `idempotency_keys`: 24-hour retention for POST idempotency

Key features:
- UUID primary keys
- JSONB metadata column for extensibility
- Automatic `updated_at` trigger
- Check constraints for data integrity

### API Endpoints

All endpoints documented in `openapi.yaml` (OpenAPI 3.1)

| Method | Endpoint | Description | Idempotent |
|--------|----------|-------------|------------|
| POST | `/v1/reminders` | Create reminder | ✅ Yes (via header) |
| GET | `/v1/reminders` | List reminders | ✅ Yes |
| GET | `/v1/reminders/:id` | Get reminder | ✅ Yes |
| PATCH | `/v1/reminders/:id` | Update reminder | ❌ No |
| DELETE | `/v1/reminders/:id` | Delete reminder | ✅ Yes |

### Idempotency Implementation

**File**: `src/middleware/idempotency.middleware.ts`

Features:
- Requires `Idempotency-Key` header (UUID v4) for POST
- Stores request hash (SHA-256) for conflict detection
- Returns `409 Conflict` if different request with same key
- Returns stored response if identical request
- 24-hour key expiration

### RFC 7807 Error Handling

**File**: `src/middleware/error.middleware.ts`

Returns `application/problem+json` for all errors:

```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "Request validation failed",
  "instance": "/v1/reminders",
  "errors": [
    {
      "field": "dueAt",
      "message": "must be a future date",
      "code": "INVALID_DATE"
    }
  ],
  "traceId": "a1b2c3d4e5f6"
}
```

## 🔗 SOA Integration

### 1. API Gateway (WSO2 API Manager)

**File**: `soa-integration/wso2/api-config.json`

Steps to deploy:
1. Import OpenAPI spec into WSO2
2. Apply policies (see `wso2-policies.xml`)
3. Configure OAuth2 scopes
4. Enable rate limiting

```bash
# Import API
curl -X POST https://wso2-apim:9443/api/am/publisher/v4/apis/import-openapi \
  -H "Authorization: Bearer $TOKEN" \
  -F file=@openapi.yaml
```

### 2. Orchestration (Camunda 8)

**File**: `soa-integration/camunda/reminder-process.bpmn`

BPMN Process:
1. **Start Event**: Reminder created
2. **Timer Event**: Wait until `dueAt - advanceMinutes`
3. **Service Task**: Publish to RabbitMQ
4. **End Event**: Complete

Worker implementation: `soa-integration/camunda/worker.ts`

### 3. Messaging (RabbitMQ)

**File**: `src/integration/messaging/rabbitmq.publisher.ts`

Configuration:
- **Exchange**: `reminders.exchange` (topic)
- **Queues**:
  - `reminder_due`: Due reminders
  - `reminder_created`: New reminders
  - `reminder_updated`: Updates
- **Dead Letter Exchange**: `reminders.dlx` with retry logic

Retry Strategy:
1. Initial attempt
2. Retry after 1 minute (DLQ)
3. Retry after 5 minutes
4. Move to permanent DLQ after 3 failures

### 4. Anti-Corruption Layer (Apache Camel)

**File**: `soa-integration/camel/lms-adapter.xml`

Transforms external LMS events into Reminder commands:

```xml
<route>
  <from uri="direct:lms-assignment"/>
  <transform>
    <method ref="lmsTransformer" method="toReminderCommand"/>
  </transform>
  <to uri="http://reminders-service:3000/v1/reminders"/>
</route>
```

### 5. Notification Service

**File**: `notification-service/consumer.ts`

RabbitMQ consumer that:
1. Listens to `reminder_due` queue
2. Retrieves user push token
3. Sends via FCM/APNs
4. Acknowledges message

## 🧪 Testing

### Run All Tests

```bash
# Unit tests
npm test

# Component/Contract tests
npm run test:component

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Unit Tests

**File**: `src/__tests__/reminder.test.ts`

Tests:
- Business rule validation
- State transition logic
- Idempotency key generation
- Error mapping to RFC 7807

```bash
npm run test:unit
```

### Component/Contract Tests

**File**: `src/__tests__/api.contract.test.ts`

Uses Jest + Supertest for black-box API testing:
- OpenAPI schema validation
- Request/response format
- Status codes
- Error responses

```bash
npm run test:component
```

### Integration Tests

**File**: `src/__tests__/integration.test.ts`

Full stack testing with Testcontainers:
- PostgreSQL
- RabbitMQ
- End-to-end flows

```bash
npm run test:integration
```

### E2E Tests

**File**: `src/__tests__/e2e.test.ts`

Simulates complete user journeys:
1. Create reminder
2. Wait for due time (mocked)
3. Verify notification sent

## 📊 Observability

### OpenTelemetry Instrumentation

**File**: `src/instrumentation/opentelemetry.ts`

Configured for:
- **Traces**: HTTP requests, DB queries, RabbitMQ
- **Metrics**: Request count, duration, errors
- **Logs**: Structured logging with trace context

### View Traces

```bash
# Open Jaeger UI
open http://localhost:16686

# Query traces for reminders-service
# Filter by service: reminders-service
```

### Metrics

```bash
# Prometheus metrics endpoint
curl http://localhost:3000/metrics

# Prometheus UI
open http://localhost:9090
```

### Key Metrics

- `http_requests_total`: Total HTTP requests
- `http_request_duration_seconds`: Request latency
- `reminders_created_total`: Reminders created
- `reminders_notified_total`: Notifications sent
- `idempotency_conflicts_total`: Idempotency conflicts

## 📖 API Documentation

### Interactive Documentation

```bash
# Serve OpenAPI spec with Swagger UI
npx swagger-ui-watcher openapi.yaml
```

Open: `http://localhost:8080`

### Example Requests

#### Create Reminder (Idempotent)

```bash
curl -X POST http://localhost:3000/v1/reminders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "userId": "user-123",
    "title": "Submit assignment",
    "dueAt": "2025-11-15T10:00:00Z",
    "advanceMinutes": 30,
    "source": "LMS",
    "metadata": {
      "courseId": "CS101",
      "assignmentId": "A1"
    }
  }'
```

#### List Reminders

```bash
curl -X GET "http://localhost:3000/v1/reminders?userId=user-123&status=pending&page=1&limit=20" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

#### Update Reminder

```bash
curl -X PATCH http://localhost:3000/v1/reminders/123e4567-e89b-12d3-a456-426614174000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "status": "completed"
  }'
```

## 🛠️ Development

### Project Structure

```
phase-3-arq-sof-2/
├── openapi.yaml                    # OpenAPI 3.1 specification
├── docker-compose.yml              # Infrastructure orchestration
├── init.sql                        # PostgreSQL schema
├── src/
│   ├── models/                     # Domain models
│   ├── repositories/               # Data access layer
│   ├── services/                   # Business logic
│   ├── routes/                     # REST API routes
│   ├── middleware/                 # Express middleware
│   ├── integration/                # External integrations
│   │   ├── messaging/              # RabbitMQ
│   │   └── camunda/                # Workflow
│   ├── instrumentation/            # OpenTelemetry
│   └── __tests__/                  # Test files
├── soa-integration/                # SOA components
│   ├── wso2/                       # API Gateway config
│   ├── camunda/                    # BPMN workflows
│   ├── camel/                      # Integration routes
│   └── notification-service/       # Consumer service
└── observability/                  # Monitoring config
    ├── prometheus.yml
    └── grafana-dashboards/
```

### Environment Variables

Create `.env` file:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/reminders_db

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# Application
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000

# Authentication (mock for dev)
JWT_SECRET=dev-secret-key

# Observability
OTEL_SERVICE_NAME=reminders-service
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# External Services
FCM_SERVER_KEY=your-fcm-server-key
APNS_KEY_ID=your-apns-key-id
```

## 🚢 Deployment

### Production Considerations

1. **Security**:
   - Use proper JWT validation
   - Enable HTTPS/TLS
   - Rotate database credentials
   - Use secrets management (Vault, AWS Secrets Manager)

2. **Scalability**:
   - Horizontal scaling with load balancer
   - Read replicas for PostgreSQL
   - RabbitMQ clustering
   - Connection pooling

3. **Resilience**:
   - Circuit breakers (Hystrix, resilience4j)
   - Rate limiting per user
   - Graceful shutdown
   - Health checks

4. **Monitoring**:
   - APM (Application Performance Monitoring)
   - Log aggregation (ELK stack)
   - Alerting (PagerDuty, Opsgenie)

## 📚 Additional Resources

- [OpenAPI Specification](https://spec.openapis.org/oas/v3.1.0)
- [RFC 7807 Problem Details](https://tools.ietf.org/html/rfc7807)
- [Idempotency in REST APIs](https://tools.ietf.org/html/draft-ietf-httpapi-idempotency-key-header)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [RabbitMQ Tutorials](https://www.rabbitmq.com/getstarted.html)
- [Camunda 8 Documentation](https://docs.camunda.io/)

## 🤝 Contributing

1. Follow the coding standards
2. Write tests for new features
3. Update OpenAPI spec for API changes
4. Document configuration changes

## 📄 License

MIT License - See LICENSE file for details
