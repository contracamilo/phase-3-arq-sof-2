# Quick Start Guide

Welcome to the reorganized SOA project! This guide will get you up and running in 5 minutes.

## ✅ What Was Done

Your project has been reorganized following SOA best practices:

- ✅ All services moved to `services/` directory
- ✅ Integration layer organized in `integration/`
- ✅ Infrastructure code in `infrastructure/`
- ✅ Configuration files in `config/`
- ✅ Updated `docker-compose.yml` with new paths
- ✅ Created monorepo-style `package.json` for easy service management

## 🚀 Get Started in 3 Steps

### Step 1: Install Dependencies

```bash
# Install all service dependencies at once
npm run install:all
```

This will install dependencies for:
- Reminder Service
- Auth Service
- Notification Service

### Step 2: Start Infrastructure

```bash
# Start PostgreSQL, RabbitMQ, Jaeger, and Prometheus
npm run docker:up
```

This starts all supporting services. Wait ~30 seconds for services to be ready.

### Step 3: Start Your Services

**Option A - Start All Services (Recommended)**

Open 3 terminal tabs and run:

```bash
# Terminal 1 - Reminder Service
npm run dev:reminder

# Terminal 2 - Auth Service
npm run dev:auth

# Terminal 3 - Notification Service
npm run dev:notification
```

**Option B - Start One Service**

```bash
# Just the reminder service
npm run dev:reminder
```

## 🎯 Verify Everything Works

### Check Service Health

```bash
# Reminder Service
curl http://localhost:3000/health

# Auth Service
curl http://localhost:3001/health

# Notification Service (check Docker logs)
npm run docker:logs
```

### Access UIs

- **Reminder API Documentation**: http://localhost:3000/api-docs
- **Auth API Documentation**: http://localhost:3001/api-docs (when service is running)
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)
- **Jaeger Tracing**: http://localhost:16686
- **Prometheus Metrics**: http://localhost:9090

## 📂 New Directory Structure

```
phase-3-arq-sof-2/
├── services/                    # 🔵 All microservices here
│   ├── reminder-service/        # Main reminder service (was src/)
│   ├── auth-service/            # Authentication service
│   └── notification-service/    # Notification service
│
├── integration/                 # 🟢 SOA integration patterns
│   ├── orchestration/          # Camunda BPMN workflows
│   ├── api-gateway/            # WSO2 API Gateway configs
│   └── messaging/              # Apache Camel routes
│
├── infrastructure/             # 🟡 Infrastructure as Code
│   ├── docker/                # Docker Compose & Dockerfiles
│   └── observability/         # Prometheus configs
│
├── config/                     # ⚙️  Configuration files
│   ├── .env.example
│   ├── .eslintrc.json
│   ├── jest.config.js
│   └── tsconfig.json
│
├── docs/                       # 📚 Documentation
├── scripts/                    # 🛠️  Utility scripts
└── shared/                     # 🔄 Shared code (future)
```

## 🎓 Common Commands

### Development

```bash
npm run dev:reminder           # Start reminder service
npm run dev:auth              # Start auth service
npm run dev:notification      # Start notification service
```

### Testing

```bash
npm run test:all              # Test all services
npm run test:reminder         # Test reminder service
npm run test:auth             # Test auth service
npm run test:notification     # Test notification service
```

### Building

```bash
npm run build:all             # Build all services
npm run build:reminder        # Build reminder service
npm run build:auth            # Build auth service
npm run build:notification    # Build notification service
```

### Docker

```bash
npm run docker:up             # Start infrastructure
npm run docker:up:build       # Rebuild and start
npm run docker:down           # Stop infrastructure
npm run docker:logs           # View logs
npm run docker:clean          # Remove volumes
```

### Linting & Formatting

```bash
npm run lint:all              # Lint all services
npm run format:all            # Format code
```

## 🔧 Working with Individual Services

Each service is self-contained. You can work on them independently:

```bash
# Go to a service
cd services/reminder-service

# Install dependencies
npm install

# Run tests
npm test

# Start dev server
npm run dev

# Build
npm run build
```

## 📝 Environment Variables

1. Copy the example environment file:
```bash
cp config/.env.example .env
```

2. Update values in `.env` as needed

3. (Optional) Create service-specific `.env` files:
```bash
cp .env services/reminder-service/.env
cp .env services/auth-service/.env
cp .env services/notification-service/.env
```

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Docker Containers Won't Start

```bash
# Clean everything and restart
npm run docker:clean
npm run docker:up:build
```

### Module Not Found Error

```bash
# Reinstall dependencies for the specific service
cd services/reminder-service
rm -rf node_modules
npm install
```

### Database Connection Error

```bash
# Make sure PostgreSQL is running
docker ps | grep postgres

# Restart PostgreSQL
docker restart reminders-postgres

# Check logs
docker logs reminders-postgres
```

## 📖 Learn More

- **Full Documentation**: See [README_NEW_STRUCTURE.md](./README_NEW_STRUCTURE.md)
- **Migration Guide**: See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- **Architecture**: See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- **Original README**: See [README.md](./README.md)

## 🎯 Next Steps

1. ✅ Everything running? Great! Start coding.
2. 📚 Read the [Architecture Documentation](./docs/ARCHITECTURE.md)
3. 🧪 Run the test suite: `npm run test:all`
4. 🔍 Explore the OpenAPI docs: http://localhost:3000/api-docs
5. 📊 Check distributed tracing: http://localhost:16686

## 💡 Tips

- Use **VS Code** with the ESLint and TypeScript extensions
- Enable **auto-save** for faster development
- Use **Postman** or **Thunder Client** to test APIs
- Check **RabbitMQ Management UI** to see message flow
- Use **Jaeger** to debug slow requests

## 🆘 Need Help?

- Check the [Migration Guide](./MIGRATION_GUIDE.md) for common issues
- Review service-specific README files in `services/*/README.md`
- Look at the documentation in `docs/`
- Check Docker logs: `npm run docker:logs`

## 🎉 You're Ready!

Your SOA project is now organized and ready for development. Happy coding!

---

**Key Changes Summary:**
- Services grouped in `services/` directory
- Integration patterns in `integration/` directory
- Infrastructure code in `infrastructure/` directory
- Easy-to-use npm scripts for all common tasks
- Better separation of concerns following SOA principles
