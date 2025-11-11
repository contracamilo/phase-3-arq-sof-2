# SOA Architecture Documentation

## System Overview

This document describes the Service-Oriented Architecture (SOA) implementation for the Reminders microservices platform.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Client Layer                              │
│  (Web Browser, Mobile App, External Systems)                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        API Gateway (WSO2)                            │
│  - Authentication & Authorization                                    │
│  - Rate Limiting & Throttling                                       │
│  - API Composition                                                  │
│  - Load Balancing                                                   │
│  Port: 8280                                                         │
└───────────────┬─────────────────────┬──────────────────────────────┘
                │                     │
       ┌────────┴────────┐    ┌──────┴───────┐
       │                 │    │              │
       ▼                 ▼    ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐
│  Reminder   │  │    Auth     │  │Notification │  │   Camunda    │
│   Service   │  │   Service   │  │   Service   │  │Orchestration │
│             │  │             │  │             │  │    Engine    │
│ Port: 3000  │  │ Port: 3001  │  │ Port: 3002  │  │  Port: 8080  │
└─────┬───────┘  └──────┬──────┘  └──────┬──────┘  └──────────────┘
      │                 │                │
      │                 │                │
      │         ┌───────┴────────┐       │
      │         │                │       │
      ▼         ▼                ▼       ▼
┌──────────────────────────────────────────────────────────────┐
│                    Message Broker (RabbitMQ)                 │
│  - Asynchronous Communication                                │
│  - Event-Driven Architecture                                 │
│  - Apache Camel Integration                                  │
│  Port: 5672 (AMQP), 15672 (Management UI)                   │
└──────────────────────────────────────────────────────────────┘
                             │
                             ▼
            ┌────────────────────────────────┐
            │     PostgreSQL Database        │
            │  - Reminders Data              │
            │  - User Authentication Data    │
            │  Port: 5432                    │
            └────────────────────────────────┘
```

## Service Communication Patterns

### 1. Synchronous Communication (REST)

```
Client → API Gateway → Service → Database
         ↑                ↓
         └────Response────┘
```

**Use Cases:**
- CRUD operations on reminders
- User authentication
- Real-time queries

**Technologies:**
- HTTP/REST
- JSON payloads
- OpenAPI/Swagger specs

### 2. Asynchronous Communication (Message Queue)

```
Service A → RabbitMQ → Service B
          (Publisher)  (Subscriber)
```

**Use Cases:**
- Notification delivery
- Event broadcasting
- Background processing

**Technologies:**
- RabbitMQ (AMQP)
- Apache Camel (routing)
- Firebase Cloud Messaging

### 3. Orchestration (Camunda)

```
Camunda Engine → Service A
               → Service B
               → Service C
        (Coordinates workflow)
```

**Use Cases:**
- Complex business processes
- Multi-step workflows
- Reminder escalation processes

**Technologies:**
- Camunda BPMN 2.0
- Zeebe Node.js client

## Service Responsibilities

### Reminder Service
**Port:** 3000  
**Purpose:** Core business logic for reminders

**Responsibilities:**
- Create, Read, Update, Delete reminders
- Reminder scheduling and management
- Due date tracking
- Status management (pending, completed, overdue)
- Integration with Camunda workflows

**API Endpoints:**
- `POST /api/reminders` - Create reminder
- `GET /api/reminders` - List reminders
- `GET /api/reminders/:id` - Get reminder by ID
- `PUT /api/reminders/:id` - Update reminder
- `DELETE /api/reminders/:id` - Delete reminder
- `GET /health` - Health check

**Dependencies:**
- PostgreSQL database
- RabbitMQ message broker
- Camunda orchestration engine

### Auth Service
**Port:** 3001  
**Purpose:** User authentication and authorization

**Responsibilities:**
- User registration and login
- JWT token generation and validation
- Session management
- Password encryption
- Role-based access control (RBAC)

**API Endpoints:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify JWT token
- `POST /api/auth/refresh` - Refresh token

**Dependencies:**
- PostgreSQL database
- JWT libraries

### Notification Service
**Port:** 3002  
**Purpose:** Multi-channel notification delivery

**Responsibilities:**
- Listen to RabbitMQ notification queue
- Send push notifications (Firebase)
- Send email notifications (future)
- Send SMS notifications (future)
- Notification delivery tracking

**Message Consumers:**
- `reminder.created` - New reminder notification
- `reminder.due` - Reminder due soon notification
- `reminder.overdue` - Overdue reminder notification

**Dependencies:**
- RabbitMQ message broker
- Firebase Admin SDK

## Integration Patterns

### 1. API Gateway Pattern (WSO2)

**Location:** `integration/api-gateway/`

**Configuration:**
```json
{
  "api_name": "Reminders API",
  "version": "v1",
  "context": "/api/v1",
  "endpoint": "http://reminder-service:3000"
}
```

**Features:**
- Request routing
- Authentication enforcement
- Rate limiting policies
- CORS handling
- Request/response transformation

### 2. Enterprise Integration Patterns (Apache Camel)

**Location:** `integration/messaging/`

**Routes:**
```xml
<route id="reminder-notification-route">
  <from uri="rabbitmq:reminder.events"/>
  <choice>
    <when>
      <simple>${body[event_type]} == 'created'</simple>
      <to uri="rabbitmq:notification.created"/>
    </when>
    <when>
      <simple>${body[event_type]} == 'due'</simple>
      <to uri="rabbitmq:notification.due"/>
    </when>
  </choice>
</route>
```

**Patterns Used:**
- Message Router
- Content-Based Router
- Message Translator
- Dead Letter Channel

### 3. Process Orchestration (Camunda)

**Location:** `integration/orchestration/`

**BPMN Process: Reminder Escalation**
```
[Reminder Created] → [Wait for Due Date] → [Send Notification]
                                          ↓
                          [Is Overdue?] → Yes → [Escalate]
                                          ↓
                                          No → [Complete]
```

**Process Steps:**
1. Reminder is created
2. Wait until due date
3. Check if acknowledged
4. If not acknowledged, send escalation
5. Complete or repeat

## Data Flow Examples

### Example 1: Create a Reminder

```
1. Client → POST /api/reminders → API Gateway
2. API Gateway → validates token → Auth Service
3. API Gateway → forwards request → Reminder Service
4. Reminder Service → saves to DB → PostgreSQL
5. Reminder Service → publishes event → RabbitMQ
6. RabbitMQ → delivers event → Notification Service
7. Notification Service → sends push → Firebase
8. Response flows back to client
```

### Example 2: Process Overdue Reminder (Camunda)

```
1. Camunda → checks due dates → Reminder Service
2. Reminder Service → returns overdue list
3. Camunda → starts escalation workflow
4. Camunda → sends escalation notification → RabbitMQ
5. RabbitMQ → Notification Service → Firebase
6. Camunda → updates reminder status → Reminder Service
```

## Observability Stack

### Distributed Tracing (Jaeger)
**Port:** 16686 (UI), 4318 (OTLP)

**Purpose:**
- Trace requests across services
- Identify performance bottlenecks
- Debug distributed transactions

**Implementation:**
- OpenTelemetry instrumentation
- Automatic span creation
- Context propagation

### Metrics Collection (Prometheus)
**Port:** 9090

**Metrics Collected:**
- HTTP request duration
- Database query performance
- Message queue throughput
- Service health status
- Error rates

### Logging (Winston)

**Log Levels:**
- ERROR: Application errors
- WARN: Warning conditions
- INFO: Informational messages
- DEBUG: Detailed debug information

**Log Format:**
```json
{
  "timestamp": "2025-11-11T14:05:26Z",
  "level": "info",
  "service": "reminder-service",
  "trace_id": "abc123",
  "message": "Reminder created",
  "user_id": "user123",
  "reminder_id": "rem456"
}
```

## Security Considerations

### 1. Authentication
- JWT-based authentication
- Token expiration and refresh
- Secure password hashing (bcrypt)

### 2. Authorization
- Role-Based Access Control (RBAC)
- API Gateway enforcement
- Service-level permission checks

### 3. Data Protection
- Encryption at rest (database)
- Encryption in transit (TLS/SSL)
- Sensitive data redaction in logs

### 4. API Security
- Rate limiting
- Input validation
- SQL injection prevention
- XSS protection

## Scalability Strategy

### Horizontal Scaling
- Each service can be scaled independently
- Load balancer distributes traffic
- Stateless service design

### Database Scaling
- Read replicas for read-heavy operations
- Connection pooling
- Query optimization

### Message Queue Scaling
- RabbitMQ clustering
- Queue partitioning
- Consumer groups

## Deployment Architecture

### Development Environment
```
Local Machine
├── Docker Compose
│   ├── PostgreSQL
│   ├── RabbitMQ
│   ├── Jaeger
│   └── Prometheus
└── Services (running locally)
    ├── Reminder Service (npm run dev)
    ├── Auth Service (npm run dev)
    └── Notification Service (npm run dev)
```

### Production Environment (Kubernetes)
```
Kubernetes Cluster
├── Ingress (API Gateway)
├── Service Mesh (Istio)
├── Deployments
│   ├── Reminder Service (3 replicas)
│   ├── Auth Service (2 replicas)
│   └── Notification Service (2 replicas)
├── Managed Services
│   ├── Amazon RDS (PostgreSQL)
│   ├── Amazon MQ (RabbitMQ)
│   └── CloudWatch (Monitoring)
└── Auto-scaling policies
```

## Future Enhancements

1. **API Gateway Migration**
   - Move from WSO2 to Kong or AWS API Gateway
   - Implement GraphQL endpoint

2. **Event Sourcing**
   - Implement event store
   - CQRS pattern for read/write separation

3. **Service Mesh**
   - Implement Istio or Linkerd
   - Advanced traffic management
   - Enhanced observability

4. **Additional Services**
   - Analytics Service
   - Reporting Service
   - Integration with external calendars

## References

- [OpenAPI Specification](../services/reminder-service/openapi.yaml)
- [Camunda BPMN Workflows](../integration/orchestration/)
- [Docker Configuration](../infrastructure/docker/)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
