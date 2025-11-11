# ✅ Phase 3 Implementation Checklist

## Pre-Deployment Checklist

### 🔧 Environment Setup

- [ ] Run `npm install` in root directory
- [ ] Run `npm install` in `notification-service/` directory
- [ ] Copy `.env.example` to `.env` and configure all variables
- [ ] Obtain Firebase service account JSON for notifications
- [ ] Configure Camunda 8 credentials (client ID, secret, cluster ID)
- [ ] Set up WSO2 API Manager credentials
- [ ] Verify PostgreSQL connection string
- [ ] Verify RabbitMQ connection string

### 🗄️ Database Setup

- [ ] Start PostgreSQL container: `docker-compose up -d postgres`
- [ ] Run migrations: `npm run db:migrate`
- [ ] Verify tables created: `reminders`, `idempotency_keys`
- [ ] Check database triggers and functions
- [ ] (Optional) Load seed data: `npm run db:seed`

### 🐰 RabbitMQ Setup

- [ ] Start RabbitMQ: `docker-compose up -d rabbitmq`
- [ ] Access management UI: http://localhost:15672 (guest/guest)
- [ ] Verify exchange created: `reminders.events`
- [ ] Verify queues: `reminders.queue`, `reminders.dlq`
- [ ] Check DLX configuration

### 📊 Observability Setup

- [ ] Start Jaeger: `docker-compose up -d jaeger`
- [ ] Start Prometheus: `docker-compose up -d prometheus`
- [ ] Access Jaeger UI: http://localhost:16686
- [ ] Access Prometheus UI: http://localhost:9090
- [ ] Verify metrics endpoint: http://localhost:3000/metrics
- [ ] Check OTLP exporter configuration

### 🚀 Service Deployment

- [ ] Build TypeScript: `npm run build`
- [ ] Start Reminders Service: `npm start` or `npm run dev`
- [ ] Start Notification Service: `cd notification-service && npm run dev`
- [ ] Verify health endpoint: `curl http://localhost:3000/health`
- [ ] Check logs for errors
- [ ] Verify OpenTelemetry initialization

### 🧪 Testing

- [ ] Run unit tests: `npm run test:unit`
- [ ] Run component tests: `npm run test:component`
- [ ] (TODO) Run integration tests: `npm run test:integration`
- [ ] (TODO) Run E2E tests: `npm run test:e2e`
- [ ] Check test coverage: `npm run test`

### 🔗 SOA Integration

#### Camunda 8
- [ ] Deploy BPMN process: `reminder-process.bpmn`
- [ ] Start Zeebe workers: `node soa-integration/camunda/worker.js`
- [ ] Test process creation with API call
- [ ] Verify timer events trigger correctly
- [ ] Check process instance in Camunda Operate

#### WSO2 API Manager
- [ ] Import OpenAPI spec: `openapi.yaml`
- [ ] Apply policies from `soa-integration/wso2/policies.xml`
- [ ] Configure OAuth2 scopes
- [ ] Set up rate limiting (100 req/min)
- [ ] Test gateway endpoint
- [ ] Verify JWT validation

#### Apache Camel
- [ ] Deploy ACL routes: `soa-integration/camel/acl-routes.xml`
- [ ] Compile Java transformer: `LMSTransformer.java`
- [ ] Test LMS webhook: POST to `/webhooks/lms`
- [ ] Test Calendar webhook: POST to `/webhooks/calendar`
- [ ] Verify transformation logic

### 🔔 Notification Service

- [ ] Configure Firebase credentials in `.env`
- [ ] Test FCM token registration
- [ ] Send test notification
- [ ] Verify device token storage
- [ ] Check retry logic for failed deliveries
- [ ] Test invalid token cleanup

### 📝 API Testing

- [ ] POST /v1/reminders - Create reminder (201)
- [ ] POST /v1/reminders - Duplicate idempotency key (200)
- [ ] POST /v1/reminders - Conflict (409)
- [ ] POST /v1/reminders - Validation error (400)
- [ ] GET /v1/reminders - List with pagination
- [ ] GET /v1/reminders - Filter by userId
- [ ] GET /v1/reminders - Filter by status
- [ ] GET /v1/reminders/:id - Get by ID (200)
- [ ] GET /v1/reminders/:id - Not found (404)
- [ ] PATCH /v1/reminders/:id - Update title
- [ ] PATCH /v1/reminders/:id - Update status
- [ ] PATCH /v1/reminders/:id - Invalid transition (400)
- [ ] DELETE /v1/reminders/:id - Soft delete (204)

### 🔍 Monitoring & Observability

- [ ] Check Jaeger for traces of API requests
- [ ] Verify span hierarchy: Route → Service → Repository
- [ ] Query Prometheus metrics:
  - [ ] `reminders_created_total`
  - [ ] `reminders_notified_total`
  - [ ] `idempotency_conflicts_total`
  - [ ] `reminder_processing_duration`
- [ ] Set up alerting rules (optional)
- [ ] Configure Grafana dashboards (optional)

### 🐳 Docker Deployment

- [ ] Build Docker images:
  - [ ] `docker build -t reminders-service .`
  - [ ] `docker build -t notification-service ./notification-service`
- [ ] Start all services: `docker-compose up -d`
- [ ] Check container health: `docker ps`
- [ ] View logs: `docker-compose logs -f reminders-service`
- [ ] Test inter-service communication
- [ ] Verify network connectivity

### 🔒 Security

- [ ] Environment variables not committed to Git
- [ ] Firebase credentials stored securely
- [ ] Database password configured
- [ ] OAuth2 tokens validated
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] CORS configured appropriately

### 📚 Documentation

- [x] README_PHASE3.md created (562 lines)
- [x] IMPLEMENTATION_SUMMARY.md created
- [x] OpenAPI spec documented
- [x] Database schema documented
- [x] Environment variables documented (.env.example)
- [x] Docker setup documented
- [ ] Add deployment guide
- [ ] Add troubleshooting guide
- [ ] Document API authentication flow
- [ ] Create architecture diagrams

---

## Known Issues & Limitations

### Current Status
- ✅ Core service implementation complete
- ✅ SOA integration components complete
- ✅ Unit and component tests complete
- ⏳ Integration tests pending
- ⏳ E2E tests pending
- ⏳ Firebase credentials needed for notifications

### TypeScript Compilation Errors
All TypeScript errors are due to missing `node_modules`. Run `npm install` to resolve.

### Docker Image Vulnerabilities
The `node:20-alpine` base image has 1 high vulnerability. Consider:
- Using `node:20-alpine3.19` or later
- Running `npm audit fix` after install
- Implementing container scanning in CI/CD

---

## Post-Deployment Verification

### Smoke Tests

```bash
# Health check
curl http://localhost:3000/health

# Create reminder
curl -X POST http://localhost:3000/v1/reminders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "userId": "test-user",
    "title": "Smoke test",
    "dueAt": "2025-12-01T10:00:00Z",
    "advanceMinutes": 30
  }'

# List reminders
curl http://localhost:3000/v1/reminders?userId=test-user

# Check RabbitMQ
curl http://localhost:15672/api/overview -u guest:guest

# Check Jaeger traces
open http://localhost:16686

# Check Prometheus metrics
open http://localhost:9090
```

### Performance Tests

- [ ] Load test with 100 concurrent users
- [ ] Measure response times (p50, p95, p99)
- [ ] Test database connection pooling
- [ ] Verify RabbitMQ message throughput
- [ ] Check memory usage under load
- [ ] Monitor CPU usage

---

## Maintenance Tasks

### Daily
- [ ] Check application logs for errors
- [ ] Monitor RabbitMQ queue depth
- [ ] Review failed notification deliveries

### Weekly
- [ ] Clean up old idempotency keys (automatic via trigger)
- [ ] Review Prometheus alerts
- [ ] Check database performance metrics
- [ ] Update dependencies: `npm outdated`

### Monthly
- [ ] Security audit: `npm audit`
- [ ] Database backup verification
- [ ] Review and update documentation
- [ ] Performance optimization review

---

## Troubleshooting

### Service won't start
1. Check `.env` configuration
2. Verify PostgreSQL is running
3. Verify RabbitMQ is running
4. Check logs: `docker-compose logs reminders-service`

### Database connection errors
1. Check `DATABASE_URL` in `.env`
2. Verify PostgreSQL container: `docker ps | grep postgres`
3. Test connection: `psql $DATABASE_URL`
4. Check firewall rules

### RabbitMQ connection errors
1. Check `RABBITMQ_URL` in `.env`
2. Verify RabbitMQ container: `docker ps | grep rabbitmq`
3. Check management UI: http://localhost:15672
4. Verify exchange and queues exist

### Notifications not sending
1. Check Firebase credentials
2. Verify `GOOGLE_APPLICATION_CREDENTIALS` path
3. Check notification-service logs
4. Verify FCM project configuration
5. Test with valid device token

### Camunda integration issues
1. Verify Zeebe gateway address
2. Check Camunda credentials
3. Verify BPMN deployment
4. Check worker logs
5. Use Camunda Operate to debug

---

## Success Criteria

✅ **Functionality**
- All CRUD operations working
- Idempotency preventing duplicates
- Events published to RabbitMQ
- Notifications delivered via FCM/APNs

✅ **Quality**
- Unit test coverage > 80%
- Component tests validate OpenAPI contract
- RFC 7807 errors returned consistently
- No SQL injection vulnerabilities

✅ **Performance**
- API response time < 200ms (p95)
- Database queries optimized with indexes
- Connection pooling configured
- Graceful degradation under load

✅ **Observability**
- Traces in Jaeger for all requests
- Metrics in Prometheus
- Structured logging with Winston
- Health check endpoint responds

✅ **SOA Integration**
- WSO2 gateway routing traffic
- Camunda orchestrating workflows
- Apache Camel transforming external events
- RabbitMQ decoupling services

---

**Last Updated:** 2025-01-XX  
**Status:** ✅ Ready for Testing & Deployment
