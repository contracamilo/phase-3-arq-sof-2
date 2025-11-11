# API Endpoints Reference

Quick reference guide for all API endpoints across the microservices.

## Reminder Service (Port 3000)

### Base URL
- Development: `http://localhost:3000/v1`
- Production: `https://api.example.com/v1`

### Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---|
| POST | `/reminders` | Create a new reminder | ✅ Yes |
| GET | `/reminders` | List reminders | ✅ Yes |
| GET | `/reminders/{id}` | Get reminder details | ✅ Yes |
| PATCH | `/reminders/{id}` | Update reminder | ✅ Yes |
| DELETE | `/reminders/{id}` | Delete reminder | ✅ Yes |
| POST | `/reminders/{id}/acknowledge` | Mark as acknowledged | ✅ Yes |
| GET | `/health` | Health check | ❌ No |

### Example Requests

```bash
# Create reminder (requires Idempotency-Key header)
curl -X POST http://localhost:3000/v1/reminders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -H "Idempotency-Key: unique-id-123" \
  -d '{
    "userId": "user-123",
    "title": "Submit assignment",
    "dueAt": "2025-11-15T10:00:00Z",
    "advanceMinutes": 30,
    "source": "LMS",
    "metadata": {
      "courseId": "CS101"
    }
  }'

# Get reminders
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/v1/reminders

# Health check
curl http://localhost:3000/health
```

---

## Auth Service (Port 3001)

### Base URL
- Development: `http://localhost:3001/auth`
- Production: `https://api.example.com/auth`

### Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---|
| POST | `/auth/token` | Exchange code for tokens | ❌ No |
| POST | `/auth/token` | Refresh access token | ❌ No |
| GET | `/auth/userinfo` | Get user information | ✅ Yes |
| POST | `/auth/validate` | Validate JWT token | ❌ No |
| POST | `/auth/logout` | Logout and revoke session | ✅ Yes |
| GET | `/health` | Health check | ❌ No |

### Example Requests

```bash
# Exchange authorization code for tokens
curl -X POST http://localhost:3001/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "auth-code-from-oidc",
    "state": "optional-state-value"
  }'

# Response:
# {
#   "access_token": "eyJhbGciOiJIUzI1NiI...",
#   "token_type": "Bearer",
#   "expires_in": 3600,
#   "refresh_token": "refresh-token-xyz",
#   "scope": "openid profile email"
# }

# Refresh token
curl -X POST http://localhost:3001/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "refresh-token-xyz"
  }'

# Get user info
curl -H "Authorization: Bearer <access-token>" \
  http://localhost:3001/auth/userinfo

# Validate token
curl -X POST http://localhost:3001/auth/validate \
  -H "Content-Type: application/json" \
  -d '{"token": "<jwt-token>"}'

# Logout
curl -X POST \
  -H "Authorization: Bearer <access-token>" \
  http://localhost:3001/auth/logout
```

---

## Notification Service (Port 3002)

### Type: RabbitMQ Consumer (Async)

**Note:** Notification Service is an asynchronous message consumer. It doesn't expose traditional HTTP endpoints. Instead, it consumes events from RabbitMQ.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/metrics` | Service metrics |

### Message Queue

| Queue Name | Description | Source |
|-----------|-------------|--------|
| `reminder_due` | Reminder due notification events | Reminder Service |

### Example Event Structure

```json
{
  "eventType": "reminder_due",
  "data": {
    "reminderId": "reminder-12345",
    "userId": "user-67890",
    "title": "Submit assignment",
    "dueAt": "2025-11-15T10:00:00Z",
    "source": "LMS",
    "metadata": {
      "courseId": "CS101",
      "examType": "midterm"
    }
  }
}
```

### Processing Flow

1. Reminder Service publishes `reminder_due` event to RabbitMQ
2. Notification Service consumes the event
3. Retrieves user's device tokens
4. Sends push notifications via Firebase Cloud Messaging (FCM) or Apple Push Notifications (APNs)
5. Acknowledges message on successful delivery
6. Retries up to 3 times on failure
7. Sends to Dead Letter Queue (DLQ) if all retries exhausted

### Example Requests

```bash
# Health check
curl http://localhost:3002/health

# Get metrics
curl http://localhost:3002/metrics
```

---

## Common Headers

### Authentication
```
Authorization: Bearer <jwt-token>
```

### Idempotency (Reminder Service)
```
Idempotency-Key: <unique-id>
```

### Content Type
```
Content-Type: application/json
```

---

## Response Codes

### Success Codes
- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `204 No Content` - Success with no response body

### Client Error Codes
- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - Missing/invalid authentication
- `403 Forbidden` - Insufficient permissions
- `409 Conflict` - Resource conflict (e.g., duplicate idempotency key)

### Server Error Codes
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service temporarily unavailable

---

## Error Response Format (RFC 7807)

```json
{
  "error": "invalid_request",
  "error_description": "grant_type parameter is required",
  "status_code": 400,
  "timestamp": "2025-11-11T16:30:00Z"
}
```

---

## Pagination

Endpoints that return lists support pagination:

```bash
# Query parameters
?page=1
?limit=20
?offset=0

# Example
curl "http://localhost:3000/v1/reminders?page=1&limit=10"
```

---

## Filtering & Sorting

```bash
# Filter reminders
curl "http://localhost:3000/v1/reminders?userId=user-123&status=active"

# Sort reminders
curl "http://localhost:3000/v1/reminders?sort=dueAt:asc"
curl "http://localhost:3000/v1/reminders?sort=createdAt:desc"
```

---

## Rate Limiting

- Auth Service: 100 requests/minute per IP
- Reminder Service: 1000 requests/minute per IP
- Notification Service: No rate limit (async processing)

---

## Testing APIs

### Using curl
```bash
curl -X <METHOD> <URL> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '<payload>'
```

### Using Postman
1. Import OpenAPI YAML files
2. Set `base_url` variable
3. Set `token` variable
4. Test endpoints with pre-configured requests

### Using Thunder Client (VS Code)
1. Install extension
2. Import OpenAPI YAML files
3. Use built-in environment variables

---

## See Also

- [API Documentation](./API_DOCUMENTATION.md) - Detailed API specs
- [QUICKSTART.md](../QUICKSTART.md) - Getting started guide
- [README_NEW_STRUCTURE.md](../README_NEW_STRUCTURE.md) - Architecture overview
