# API Documentation

This project includes OpenAPI/Swagger documentation for all microservices.

## Available APIs

### 1. Reminder Service API
- **Port:** 3000
- **OpenAPI Spec:** [services/reminder-service/openapi.yaml](../services/reminder-service/openapi.yaml)
- **Swagger UI:** http://localhost:3000/api-docs (when running)
- **Features:**
  - Create, read, update, list reminders
  - Idempotent operations with Idempotency-Key
  - Filter by user, status, due date
  - RFC 7807 compliant error responses

### 2. Auth Service API
- **Port:** 3001
- **OpenAPI Spec:** [services/auth-service/openapi.yaml](../services/auth-service/openapi.yaml)
- **Swagger UI:** http://localhost:3001/api-docs (when running)
- **Features:**
  - OAuth2/OIDC token exchange
  - Token validation and refresh
  - User information retrieval
  - Session management and logout

### 3. Notification Service API
- **Port:** 3002
- **OpenAPI Spec:** [services/notification-service/openapi.yaml](../services/notification-service/openapi.yaml)
- **Type:** Async message consumer (RabbitMQ-based)
- **Features:**
  - FCM (Firebase Cloud Messaging) support
  - APNs (Apple Push Notifications) support
  - Retry logic with exponential backoff
  - Dead Letter Queue (DLQ) for failed messages
  - Health checks and metrics

## Accessing the API Documentation

### While Services are Running

1. Start the services:
   ```bash
   npm run dev:reminder  # Terminal 1
   npm run dev:auth     # Terminal 2
   ```

2. Visit the Swagger UI:
   - Reminder Service: http://localhost:3000/api-docs
   - Auth Service: http://localhost:3001/api-docs

### OpenAPI YAML Files

You can also view the raw OpenAPI specifications:
- [Reminder Service OpenAPI](../services/reminder-service/openapi.yaml)
- [Auth Service OpenAPI](../services/auth-service/openapi.yaml)
- [Notification Service OpenAPI](../services/notification-service/openapi.yaml)

## Swagger/OpenAPI Standards

All APIs follow the **OpenAPI 3.1.0** specification.

### Common Features

**Security:**
- Bearer token authentication (JWT)
- OAuth2/OIDC support

**Error Responses:**
- RFC 7807 Problem Detail format
- Consistent error codes
- Detailed error descriptions

**Request/Response:**
- JSON request/response bodies
- Content negotiation support
- Example payloads for all operations

**API Design:**
- RESTful endpoints
- Idempotency support (where applicable)
- Pagination support (where applicable)
- Filtering and sorting (where applicable)

## Integration with Tools

### API Testing

**Postman:**
1. Import OpenAPI YAML files into Postman
2. Set environment variables (auth tokens, IDs, etc.)
3. Test endpoints directly

**Thunder Client (VS Code):**
1. Install Thunder Client extension
2. Import OpenAPI YAML files
3. Test with VS Code integration

**curl:**
```bash
# Get health status
curl http://localhost:3000/health

# Create a reminder
curl -X POST http://localhost:3000/v1/reminders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"userId":"user-123","title":"Test","dueAt":"2025-12-01T10:00:00Z"}'

# Validate a token
curl -X POST http://localhost:3001/auth/validate \
  -H "Content-Type: application/json" \
  -d '{"token":"<jwt-token>"}'
```

### IDE Integration

**VS Code:**
- Install "OpenAPI (Swagger) Editor" extension
- Open YAML files to see previews
- Auto-completion for OpenAPI specs

**JetBrains IDEs:**
- Built-in OpenAPI/Swagger support
- Automatic code generation
- Live preview in gutter

## API Versioning

All APIs follow semantic versioning:
- Current version: **1.0.0**
- Version in URLs: `/v1`

Future breaking changes will increment major version:
- v2, v3, etc.

## Authentication

### For Reminder Service
```bash
# Get token from Auth Service
TOKEN=$(curl -X POST http://localhost:3001/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "auth-code-from-oidc",
    "state": "optional-state"
  }' | jq -r '.access_token')

# Use token in requests
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/v1/reminders
```

### For Auth Service
```bash
# Token validation doesn't require authentication
curl -X POST http://localhost:3001/auth/validate \
  -H "Content-Type: application/json" \
  -d '{"token":"<jwt-token>"}'

# User info requires authentication
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/auth/userinfo
```

## Observability

### Jaeger Distributed Tracing
- All APIs integrated with OpenTelemetry
- View traces: http://localhost:16686
- Filter by service, operation, error status

### Prometheus Metrics
- Endpoint-level metrics
- Request duration histograms
- Error rate tracking
- View metrics: http://localhost:9090

## Support

For issues or questions:
1. Check the [QUICKSTART.md](../QUICKSTART.md)
2. Review service-specific README files
3. Check Docker logs: `npm run docker:logs`
4. See [MIGRATION_GUIDE.md](../MIGRATION_GUIDE.md) for troubleshooting
