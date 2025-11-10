# Reminder Service - SOA Architecture

A REST-based Reminder Service built with Service-Oriented Architecture (SOA) principles using Node.js, TypeScript, Express, PostgreSQL, and Docker Compose.

## 🎯 Features

- **CRUD Operations**: Complete Create, Read, Update, Delete operations for reminders
- **Idempotency**: POST requests support idempotency keys to prevent duplicate creations
- **Error Handling**: Comprehensive error handling with meaningful HTTP status codes
- **Event Logging**: Simulated orchestration and messaging with event logs
- **Data Validation**: Request validation for all endpoints
- **Docker Support**: Full Docker Compose setup with PostgreSQL
- **Automated Tests**: Jest-based test suite with supertest
- **TypeScript**: Type-safe implementation

## 📋 Prerequisites

- Node.js 18+ (for local development)
- Docker and Docker Compose (recommended)
- PostgreSQL 15+ (if running without Docker)

## 🚀 Quick Start

### Using Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/contracamilo/phase-3-arq-sof-2.git
cd phase-3-arq-sof-2
```

2. Start the services:
```bash
docker-compose up --build
```

The API will be available at `http://localhost:3000`

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Start PostgreSQL (using Docker):
```bash
docker-compose up postgres
```

4. Run the development server:
```bash
npm run dev
```

## 📊 Database Schema

### Reminders Table
```sql
CREATE TABLE reminders (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Idempotency Keys Table
```sql
CREATE TABLE idempotency_keys (
    key VARCHAR(255) PRIMARY KEY,
    reminder_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE
);
```

## 🔌 API Endpoints

### Health Check
```
GET /health
```
Returns the service health status.

**Response:**
```json
{
  "status": "healthy",
  "service": "Reminder Service",
  "timestamp": "2025-11-10T21:59:37.123Z"
}
```

### Create Reminder
```
POST /api/reminders
```

**Headers:**
- `Content-Type: application/json`
- `Idempotency-Key: <uuid>` (optional)

**Request Body:**
```json
{
  "title": "Team Meeting",
  "description": "Quarterly review meeting",
  "due_date": "2025-12-15T10:00:00Z",
  "status": "pending"
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Team Meeting",
    "description": "Quarterly review meeting",
    "due_date": "2025-12-15T10:00:00.000Z",
    "status": "pending",
    "created_at": "2025-11-10T22:00:00.000Z",
    "updated_at": "2025-11-10T22:00:00.000Z"
  }
}
```

### Get All Reminders
```
GET /api/reminders
```

**Response (200):**
```json
{
  "status": "success",
  "count": 2,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "Team Meeting",
      "description": "Quarterly review meeting",
      "due_date": "2025-12-15T10:00:00.000Z",
      "status": "pending",
      "created_at": "2025-11-10T22:00:00.000Z",
      "updated_at": "2025-11-10T22:00:00.000Z"
    }
  ]
}
```

### Get Reminder by ID
```
GET /api/reminders/:id
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Team Meeting",
    "description": "Quarterly review meeting",
    "due_date": "2025-12-15T10:00:00.000Z",
    "status": "pending",
    "created_at": "2025-11-10T22:00:00.000Z",
    "updated_at": "2025-11-10T22:00:00.000Z"
  }
}
```

**Response (404):**
```json
{
  "status": "error",
  "message": "Reminder not found"
}
```

### Update Reminder
```
PUT /api/reminders/:id
```

**Request Body (all fields optional):**
```json
{
  "title": "Updated Team Meeting",
  "description": "Updated description",
  "due_date": "2025-12-20T10:00:00Z",
  "status": "completed"
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Updated Team Meeting",
    "description": "Updated description",
    "due_date": "2025-12-20T10:00:00.000Z",
    "status": "completed",
    "created_at": "2025-11-10T22:00:00.000Z",
    "updated_at": "2025-11-10T22:10:00.000Z"
  }
}
```

### Delete Reminder
```
DELETE /api/reminders/:id
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Reminder deleted successfully"
}
```

## 🔐 Idempotency

The service supports idempotency for POST requests to prevent duplicate reminder creation. Send an `Idempotency-Key` header with a unique UUID:

```bash
curl -X POST http://localhost:3000/api/reminders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "title": "Important Reminder",
    "due_date": "2025-12-15T10:00:00Z"
  }'
```

Subsequent requests with the same idempotency key will return the same reminder without creating a duplicate.

## 🔄 Event Logging (SOA Simulation)

The service simulates SOA orchestration and messaging patterns through event logging. Each operation logs events that would typically be published to a message broker (e.g., RabbitMQ, Kafka):

**Event Types:**
- `REMINDER_CREATED`
- `REMINDER_UPDATED`
- `REMINDER_DELETED`
- `REMINDER_RETRIEVED`
- `REMINDER_LIST_RETRIEVED`
- `IDEMPOTENT_REQUEST`
- `ERROR_OCCURRED`

**Example Event Log:**
```json
{
  "event": "REMINDER_CREATED",
  "timestamp": "2025-11-10T22:00:00.000Z",
  "service": "REMINDER_SERVICE",
  "payload": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Team Meeting",
    "idempotencyKey": null
  }
}
```

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

The test suite includes:
- CRUD operation tests
- Validation tests
- Idempotency tests
- Error handling tests
- Health check tests

## 🏗️ Project Structure

```
.
├── src/
│   ├── __tests__/          # Test files
│   │   └── reminder.test.ts
│   ├── config/             # Configuration
│   │   └── database.ts
│   ├── middleware/         # Express middleware
│   │   ├── error.middleware.ts
│   │   └── validation.middleware.ts
│   ├── models/             # Data models and types
│   │   └── reminder.model.ts
│   ├── routes/             # API routes
│   │   └── reminder.routes.ts
│   ├── services/           # Business logic
│   │   └── reminder.service.ts
│   ├── utils/              # Utilities
│   │   └── logger.ts
│   ├── app.ts              # Express app setup
│   └── index.ts            # Entry point
├── docker-compose.yml      # Docker Compose configuration
├── Dockerfile              # Container image definition
├── init.sql                # Database initialization
├── jest.config.js          # Jest configuration
├── tsconfig.json           # TypeScript configuration
├── package.json            # Dependencies and scripts
└── README.md               # This file
```

## 🛠️ Development Scripts

- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production build
- `npm run dev` - Run development server with hot reload
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

## 🐳 Docker Commands

### Start all services
```bash
docker-compose up
```

### Start in detached mode
```bash
docker-compose up -d
```

### View logs
```bash
docker-compose logs -f
```

### Stop services
```bash
docker-compose down
```

### Rebuild and start
```bash
docker-compose up --build
```

## 📝 Environment Variables

Create a `.env` file based on `.env.example`:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/reminders_db
NODE_ENV=development
```

## 🏛️ SOA Architecture Principles

This service follows SOA principles:

1. **Service Contract**: Well-defined REST API with clear request/response schemas
2. **Loose Coupling**: Database operations isolated in service layer
3. **Abstraction**: Implementation details hidden behind API interface
4. **Reusability**: Generic CRUD operations applicable to other services
5. **Statelessness**: RESTful stateless design (idempotency for safety)
6. **Discoverability**: Self-documenting API with health checks
7. **Event-Driven**: Simulated event publishing for service orchestration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Build: `npm run build`
6. Submit a pull request

## 📄 License

ISC

## 👥 Author

Academic project for Software Architecture - Phase 3

## 🆘 Troubleshooting

### Port Already in Use
If port 3000 or 5432 is already in use, change the ports in `.env` and `docker-compose.yml`.

### Database Connection Failed
Ensure PostgreSQL is running and the connection string in `.env` is correct.

### Tests Failing
Make sure the database is running and accessible before running tests.

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Docker Documentation](https://docs.docker.com/)
- [SOA Principles](https://en.wikipedia.org/wiki/Service-oriented_architecture)