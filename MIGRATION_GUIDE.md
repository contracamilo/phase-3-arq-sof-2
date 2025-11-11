# Migration Guide - New SOA Structure

## Overview

This guide explains the reorganization of the project following SOA best practices. The new structure separates concerns, improves maintainability, and follows industry standards for microservices architecture.

## What Changed?

### Directory Structure

#### Before
```
phase-3-arq-sof-2/
├── src/                       # Reminder service code mixed at root
├── auth-service/              # Auth service at root
├── notification-service/      # Notification service at root
├── soa-integration/           # Integration code scattered
├── Dockerfile                 # Dockerfiles at root
├── docker-compose.yml
├── observability/
├── .env.example
├── init.sql
└── openapi.yaml
```

#### After
```
phase-3-arq-sof-2/
├── services/                  # All microservices grouped
│   ├── reminder-service/      # Moved from src/
│   ├── auth-service/          # Moved from root
│   └── notification-service/  # Moved from root
├── shared/                    # Future shared code
│   ├── infrastructure/
│   ├── middleware/
│   └── utils/
├── integration/               # SOA integration patterns
│   ├── orchestration/         # Camunda workflows
│   ├── api-gateway/          # WSO2 configs
│   └── messaging/            # Apache Camel routes
├── infrastructure/            # Infrastructure code
│   ├── docker/               # All Docker files
│   └── observability/        # Monitoring configs
├── config/                    # Configuration files
├── docs/                      # Documentation
└── scripts/                   # Utility scripts
```

## Migration Steps

### 1. Update Your Local Environment

#### Stop Running Services
```bash
# Stop any running services
docker-compose down
pkill -f "node.*reminder"
```

#### Clean Old Dependencies
```bash
# Remove old node_modules at root
rm -rf node_modules
rm -rf dist
rm -rf coverage
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install all service dependencies
npm run install:all

# Or install individually
npm run install:reminder
npm run install:auth
npm run install:notification
```

### 3. Update Environment Variables

Your `.env` file location hasn't changed, but you may need to create service-specific `.env` files:

```bash
# Copy environment template
cp config/.env.example .env

# Create service-specific env files
cp .env services/reminder-service/.env
cp .env services/auth-service/.env
cp .env services/notification-service/.env
```

### 4. Update Docker Commands

#### Old Commands
```bash
docker-compose up
docker-compose down
```

#### New Commands
```bash
npm run docker:up
npm run docker:down
npm run docker:up:build  # Build and start
npm run docker:clean     # Remove volumes
```

Or use the full path:
```bash
docker-compose -f infrastructure/docker/docker-compose.yml up
```

### 5. Update Development Workflow

#### Starting Services

**Reminder Service:**
```bash
# Old
npm run dev

# New
npm run dev:reminder
# Or
cd services/reminder-service && npm run dev
```

**Auth Service:**
```bash
# Old
cd auth-service && npm run dev

# New
npm run dev:auth
# Or
cd services/auth-service && npm run dev
```

**Notification Service:**
```bash
# Old
cd notification-service && npm run dev

# New
npm run dev:notification
# Or
cd services/notification-service && npm run dev
```

### 6. Update Testing Commands

```bash
# Test all services
npm run test:all

# Test individual services
npm run test:reminder
npm run test:auth
npm run test:notification
```

### 7. Update Build Commands

```bash
# Build all services
npm run build:all

# Build individual services
npm run build:reminder
npm run build:auth
npm run build:notification
```

## Updated File Locations

| Old Location | New Location |
|--------------|--------------|
| `src/*` | `services/reminder-service/*` |
| `auth-service/*` | `services/auth-service/*` |
| `notification-service/*` | `services/notification-service/*` |
| `Dockerfile` | `infrastructure/docker/reminder-service.Dockerfile` |
| `docker-compose.yml` | `infrastructure/docker/docker-compose.yml` |
| `init.sql` | `services/reminder-service/init.sql` |
| `openapi.yaml` | `services/reminder-service/openapi.yaml` |
| `.env.example` | `config/.env.example` |
| `.eslintrc.json` | `config/.eslintrc.json` |
| `jest.config.js` | `config/jest.config.js` |
| `tsconfig.json` | `config/tsconfig.json` |
| `soa-integration/camunda/*` | `integration/orchestration/*` |
| `soa-integration/wso2/*` | `integration/api-gateway/*` |
| `soa-integration/camel/*` | `integration/messaging/*` |
| `observability/*` | `infrastructure/observability/*` |

## IDE Configuration Updates

### VS Code

Update `.vscode/settings.json`:
```json
{
  "eslint.workingDirectories": [
    "services/reminder-service",
    "services/auth-service",
    "services/notification-service"
  ],
  "typescript.tsdk": "services/reminder-service/node_modules/typescript/lib"
}
```

### IntelliJ / WebStorm

1. Mark directories:
   - Mark `services/*/src` as "Sources Root"
   - Mark `services/*/node_modules` as "Excluded"
   - Mark `shared/` as "Sources Root"

2. Update Run Configurations to use new paths

## CI/CD Updates

### GitHub Actions

If you have workflow files referencing old paths, update them:

```yaml
# Old
- name: Test
  run: npm test
  working-directory: ./

# New
- name: Test Reminder Service
  run: npm test
  working-directory: ./services/reminder-service
```

## Common Issues & Solutions

### Issue 1: Module Not Found

**Error:** `Cannot find module 'express'`

**Solution:** Install dependencies for the specific service
```bash
cd services/reminder-service
npm install
```

### Issue 2: Docker Build Fails

**Error:** `COPY failed: file not found`

**Solution:** Update Docker context and paths
```bash
# Use new docker-compose location
docker-compose -f infrastructure/docker/docker-compose.yml up --build
```

### Issue 3: Database Init Script Not Found

**Error:** `init.sql not found`

**Solution:** The docker-compose.yml has been updated with the correct path:
```yaml
volumes:
  - ../../services/reminder-service/init.sql:/docker-entrypoint-initdb.d/init.sql
```

### Issue 4: ESLint/TypeScript Config Not Found

**Error:** Configuration files not found

**Solution:** Services now have their own config files. Copy from `config/`:
```bash
cp config/tsconfig.json services/reminder-service/
cp config/.eslintrc.json services/reminder-service/
```

## Benefits of New Structure

### 1. **Clear Separation of Concerns**
- Each service is self-contained
- Integration layer is separate from business logic
- Infrastructure code is isolated

### 2. **Independent Deployment**
- Each service can be deployed independently
- Easier to scale individual services
- Reduced risk of cross-service contamination

### 3. **Better Organization**
- Easy to find files
- Consistent structure across services
- Follows microservices best practices

### 4. **Improved Collaboration**
- Teams can work on different services without conflicts
- Clear ownership boundaries
- Easier onboarding for new developers

### 5. **Simplified Testing**
- Test services independently
- Mock dependencies more easily
- Faster test execution

## Rollback Plan

If you need to rollback to the old structure:

```bash
# Restore old package.json
mv package.json.old package.json

# The old files are still in place:
# - src/ (still exists)
# - auth-service/ (now duplicated in services/)
# - notification-service/ (now duplicated in services/)

# Just don't use the new directories
```

## Next Steps

1. ✅ Read this migration guide
2. ✅ Update local environment
3. ✅ Install dependencies
4. ✅ Test each service individually
5. ✅ Update your IDE configuration
6. ✅ Update CI/CD pipelines (if applicable)
7. ✅ Review the new [README_NEW_STRUCTURE.md](./README_NEW_STRUCTURE.md)

## Questions?

- Check [README_NEW_STRUCTURE.md](./README_NEW_STRUCTURE.md) for architecture details
- Review service-specific README files in `services/*/README.md`
- See documentation in `docs/`

## Cleanup (Optional)

After confirming everything works, you can remove old directories:

```bash
# ⚠️ Only do this after thorough testing!
rm -rf src/
rm -rf auth-service/
rm -rf notification-service/
rm -rf soa-integration/
rm -rf observability/
rm package.json.old
rm package-lock.json
```

**Note:** Keep `.env`, `.git`, `docs/`, and `scripts/` as they're still used.
