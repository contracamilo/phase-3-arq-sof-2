# 🐳 Docker Commands Quick Reference

## ⚠️ Important: Use `docker compose` (V2), not `docker-compose`

Docker Desktop includes Docker Compose V2 as a plugin. Use **`docker compose`** with a space instead of `docker-compose` with a hyphen.

---

## 🚀 Quick Start Commands

### Start All Services
```bash
# Start infrastructure
docker compose up -d postgres rabbitmq jaeger prometheus

# Start application services
docker compose up -d reminders-service notification-service

# Or start everything at once
docker compose up -d
```

### View Running Containers
```bash
docker compose ps
```

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f reminders-service
docker compose logs -f notification-service
docker compose logs -f postgres
docker compose logs -f rabbitmq
```

### Stop Services
```bash
# Stop all
docker compose stop

# Stop specific service
docker compose stop reminders-service
```

### Restart Services
```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart reminders-service
```

### Remove Containers
```bash
# Stop and remove containers
docker compose down

# Remove containers and volumes (DELETES DATA)
docker compose down -v
```

### Rebuild Images
```bash
# Rebuild all images
docker compose build

# Rebuild specific service
docker compose build reminders-service

# Rebuild and start
docker compose up -d --build
```

---

## 🔍 Debugging Commands

### Execute Commands in Containers
```bash
# PostgreSQL
docker compose exec postgres psql -U postgres -d reminders_db

# Check database tables
docker compose exec postgres psql -U postgres -d reminders_db -c "\dt"

# Query reminders
docker compose exec postgres psql -U postgres -d reminders_db -c "SELECT * FROM reminders;"

# Shell access
docker compose exec postgres sh
docker compose exec rabbitmq sh
```

### Check Container Health
```bash
# View health status
docker compose ps

# Inspect specific container
docker inspect reminders-postgres
docker inspect reminders-rabbitmq
```

### View Resource Usage
```bash
docker stats
```

---

## 🌐 Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| **Reminders API** | http://localhost:3000 | - |
| **Health Check** | http://localhost:3000/health | - |
| **PostgreSQL** | localhost:5432 | postgres/postgres |
| **RabbitMQ Management** | http://localhost:15672 | guest/guest |
| **RabbitMQ AMQP** | amqp://localhost:5672 | guest/guest |
| **Jaeger UI** | http://localhost:16686 | - |
| **Prometheus UI** | http://localhost:9090 | - |

---

## 📊 Monitoring Commands

### RabbitMQ
```bash
# List queues
docker compose exec rabbitmq rabbitmqctl list_queues

# List exchanges
docker compose exec rabbitmq rabbitmqctl list_exchanges

# Check node status
docker compose exec rabbitmq rabbitmqctl status
```

### PostgreSQL
```bash
# List databases
docker compose exec postgres psql -U postgres -c "\l"

# List tables in reminders_db
docker compose exec postgres psql -U postgres -d reminders_db -c "\dt"

# Count reminders
docker compose exec postgres psql -U postgres -d reminders_db -c "SELECT COUNT(*) FROM reminders;"

# View recent reminders
docker compose exec postgres psql -U postgres -d reminders_db -c "SELECT id, title, status, created_at FROM reminders ORDER BY created_at DESC LIMIT 10;"
```

---

## 🧪 Testing Workflow

### 1. Start Infrastructure
```bash
docker compose up -d postgres rabbitmq
```

### 2. Wait for Health
```bash
# Check until both are healthy
docker compose ps
```

### 3. Initialize Database (if needed)
```bash
docker compose exec postgres psql -U postgres -d reminders_db -f /docker-entrypoint-initdb.d/init.sql
```

### 4. Run Application Locally
```bash
# Terminal 1 - Main Service
npm run dev

# Terminal 2 - Notification Service
cd notification-service && npm run dev
```

### 5. Or Run with Docker
```bash
docker compose up -d reminders-service notification-service
```

### 6. Test API
```bash
# Health check
curl http://localhost:3000/health

# Create reminder
curl -X POST http://localhost:3000/v1/reminders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "userId": "test-user",
    "title": "Test Reminder",
    "dueAt": "2025-11-12T10:00:00Z",
    "advanceMinutes": 30
  }'

# List reminders
curl "http://localhost:3000/v1/reminders?userId=test-user"
```

### 7. Check Logs
```bash
docker compose logs -f reminders-service notification-service
```

---

## 🛠️ Maintenance Commands

### Clean Up Docker Resources
```bash
# Remove unused containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Remove everything (CAREFUL!)
docker system prune -a
```

### Reset Everything
```bash
# Stop and remove all
docker compose down -v

# Rebuild from scratch
docker compose up -d --build
```

### Backup Database
```bash
# Export database
docker compose exec postgres pg_dump -U postgres reminders_db > backup.sql

# Restore database
docker compose exec -T postgres psql -U postgres reminders_db < backup.sql
```

---

## 🚨 Troubleshooting

### Port Already in Use
```bash
# Find process using port
lsof -i :5432  # PostgreSQL
lsof -i :5672  # RabbitMQ
lsof -i :3000  # Reminders Service

# Kill process
kill -9 <PID>
```

### Container Won't Start
```bash
# Check logs
docker compose logs <service-name>

# Remove and recreate
docker compose rm -f <service-name>
docker compose up -d <service-name>
```

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker compose ps postgres

# Check health
docker compose exec postgres pg_isready -U postgres

# View logs
docker compose logs postgres
```

### RabbitMQ Issues
```bash
# Check status
docker compose exec rabbitmq rabbitmq-diagnostics ping

# View logs
docker compose logs rabbitmq

# Reset (will lose data)
docker compose down -v
docker compose up -d rabbitmq
```

---

## 📝 Development Workflow

### Daily Development
```bash
# 1. Start infrastructure (leave running)
docker compose up -d postgres rabbitmq jaeger prometheus

# 2. Run app locally for hot-reload
npm run dev

# 3. Watch logs in separate terminal
docker compose logs -f postgres rabbitmq

# 4. Stop when done
docker compose stop
```

### Full Docker Development
```bash
# 1. Start everything
docker compose up -d

# 2. Watch logs
docker compose logs -f

# 3. Make code changes

# 4. Rebuild and restart
docker compose up -d --build reminders-service

# 5. Stop when done
docker compose down
```

---

## ✅ Current Status

Your services are running:
- ✅ PostgreSQL: http://localhost:5432 (healthy)
- ✅ RabbitMQ: http://localhost:15672 (healthy)
- ⏳ Reminders Service: Starting...
- ⏳ Notification Service: Starting...

Next steps:
1. Start the application: `npm run dev`
2. Test Firebase: `node test-firebase.js`
3. Create a test reminder (see Testing Workflow above)

---

**Last Updated:** November 11, 2025  
**Docker Compose Version:** v2.39.2
