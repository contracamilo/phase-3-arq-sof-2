# SOA Project - Organized Structure

This project follows Service-Oriented Architecture (SOA) best practices with clear separation of concerns.

## 📁 Project Structure

```
phase-3-arq-sof-2/
├── services/                    # Microservices (business logic)
│   ├── reminder-service/        # Core reminder service
│   ├── auth-service/           # Authentication service
│   └── notification-service/   # Notification service
│
├── shared/                      # Shared libraries & utilities
│   ├── infrastructure/         # Shared infrastructure code
│   ├── middleware/             # Common middleware
│   └── utils/                  # Utility functions
│
├── integration/                 # SOA Integration Layer
│   ├── orchestration/          # Camunda BPMN workflows
│   ├── api-gateway/            # WSO2 API Gateway configs
│   └── messaging/              # RabbitMQ, Apache Camel routes
│
├── infrastructure/             # Infrastructure as Code
│   ├── docker/                # Docker & Docker Compose files
│   └── observability/         # Prometheus, Grafana configs
│
├── docs/                       # Documentation
├── scripts/                    # Setup & utility scripts
├── config/                     # Root-level configurations
└── .github/                    # CI/CD workflows
```

## 🎯 Architecture Principles

### 1. **Service Independence**

Each service in `services/` is independently deployable with:

- Own package.json and dependencies
- Own Dockerfile
- Own database schema (init.sql)
- Own OpenAPI specification

### 2. **Shared Components**

The `shared/` directory contains:

- Common middleware (error handling, logging, validation)
- Utility functions used across services
- Infrastructure code (database connections, message queue clients)

### 3. **Integration Layer**

The `integration/` directory implements SOA patterns:

- **Orchestration** (Camunda): Business process management
- **API Gateway** (WSO2): API composition, security, rate limiting
- **Messaging** (Apache Camel): Enterprise Integration Patterns (EIP)

### 4. **Infrastructure as Code**

The `infrastructure/` directory contains:

- Docker configurations for all services
- Observability stack (Prometheus, Grafana, OpenTelemetry)
- Environment-specific configurations

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+

### Quick Start

1. **Start all services:**

```bash
docker-compose -f infrastructure/docker/docker-compose.yml up --build
```

2. **Start individual service:**

```bash
cd services/reminder-service
npm install
npm run dev
```

3. **Run tests:**

```bash
npm test                    # All tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
```

## 📊 Service Communication

```
┌─────────────┐
│  API Gateway│ (WSO2)
│  (Port 8280)│
└──────┬──────┘
       │
       ├──────────────┬──────────────┬──────────────┐
       │              │              │              │
┌──────▼──────┐ ┌─────▼──────┐ ┌────▼────────┐ ┌──▼──────────┐
│  Reminder   │ │   Auth     │ │Notification │ │  Camunda    │
│  Service    │ │  Service   │ │  Service    │ │ Orchestrate │
│ (Port 3000) │ │(Port 3001) │ │(Port 3002)  │ │ (Port 8080) │
└──────┬──────┘ └─────┬──────┘ └────┬────────┘ └─────────────┘
       │              │              │
       └──────────────┴──────────────┴───────────────┐
                                                      │
                                              ┌───────▼────────┐
                                              │   RabbitMQ     │
                                              │  (Port 5672)   │
                                              └────────────────┘
```

## 📚 Documentation

- [Reminder Service Spec](./docs/AUTH_SERVICE_SPEC.md)
- [Firebase Setup](./docs/FIREBASE_SETUP.md)
- [Deployment Checklist](./docs/DEPLOYMENT_CHECKLIST.md)
- [Docker Commands](./docs/DOCKER_COMMANDS.md)
- [Implementation Plan](./docs/PHASE3_IMPLEMENTATION_PLAN.md)

## 🔧 Configuration

All configuration files are in the `config/` directory:

- `.env.example` - Environment variables template
- `.eslintrc.json` - ESLint configuration
- `jest.config.js` - Jest testing configuration
- `tsconfig.json` - TypeScript configuration

## 🏗️ Development Guidelines

### Adding a New Service

1. Create service directory:

```bash
mkdir -p services/my-service/src
cd services/my-service
npm init -y
```

2. Add service-specific files:

- `Dockerfile`
- `package.json`
- `tsconfig.json`
- `src/index.ts`
- `README.md`

3. Update `infrastructure/docker/docker-compose.yml`

4. Add OpenAPI specification

### Shared Code Guidelines

- Place reusable middleware in `shared/middleware/`
- Place utility functions in `shared/utils/`
- Place infrastructure code (DB, messaging) in `shared/infrastructure/`

### Integration Patterns

- **Synchronous**: REST APIs through API Gateway
- **Asynchronous**: RabbitMQ with Apache Camel routing
- **Orchestration**: Camunda for complex workflows

## 🧪 Testing Strategy

```
services/
└── reminder-service/
    └── __tests__/
        ├── unit/           # Unit tests (services, repositories)
        ├── component/      # Component tests (controllers)
        ├── integration/    # Integration tests (API + DB)
        └── e2e/           # End-to-end tests
```

## 📦 Deployment

### Docker Compose (Development)

```bash
docker-compose -f infrastructure/docker/docker-compose.yml up
```

### Kubernetes (Production)

```bash
kubectl apply -f infrastructure/k8s/
```

## 🔍 Monitoring & Observability

- **Metrics**: Prometheus → `http://localhost:9090`
- **Traces**: OpenTelemetry → Jaeger
- **Logs**: Winston → Centralized logging
- **Health Checks**: `/health` endpoint on each service

## 🤝 Contributing

1. Follow the established directory structure
2. Add tests for new features
3. Update documentation
4. Follow TypeScript and ESLint guidelines

## 📄 License

MIT
