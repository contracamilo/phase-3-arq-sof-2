# Auth Service Swagger UI - Fixes Applied

## Problem
When executing `npm run dev:auth`, the auth-service started but Swagger UI showed a blank page at `localhost:3001/api-docs/`.

## Root Causes Identified and Fixed

### 1. **Missing Swagger UI Dependencies** ✅
**Problem:** The `app.ts` file was trying to use `swagger-ui-express` and `js-yaml` without importing them.

**Solution:**
- Added `swagger-ui-express` to `package.json` dependencies
- Added `js-yaml` to `package.json` dependencies
- Added `@types/js-yaml` to devDependencies for TypeScript support
- Added `@types/swagger-ui-express` to devDependencies for type definitions

**Files Modified:**
```json
// services/auth-service/package.json
{
  "dependencies": {
    "js-yaml": "^4.1.0",
    "swagger-ui-express": "^5.0.0"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.5",
    "@types/swagger-ui-express": "^4.1.6"
  }
}
```

### 2. **Double OpenTelemetry Initialization** ✅
**Problem:** The `initializeOpenTelemetry()` function was being called twice:
- Once in `index.ts` (correct - at application startup)
- Once in `app.ts` (incorrect - duplicate call)

This caused the error: `MetricReader can not be bound to a MeterProvider again`

**Solution:**
- Removed the import of `initializeOpenTelemetry` from `app.ts`
- Removed the `initializeOpenTelemetry()` call from `app.ts`
- Kept only the single initialization in `index.ts`

**Files Modified:**
- `services/auth-service/app.ts` - Removed OTelemetry initialization

### 3. **Missing openapi.yaml in Docker Image** ✅
**Problem:** The `openapi.yaml` file existed but wasn't being copied into the Docker image, so the application couldn't load it.

Container logs showed:
```
⚠️ Could not load openapi.yaml, Swagger UI will not be available
```

**Solution:**
- Updated the Dockerfile to copy `openapi.yaml` during the build stage

**Files Modified:**
```dockerfile
# services/auth-service/Dockerfile
COPY init.sql ./
COPY openapi.yaml ./  # ← Added this line
```

## Implementation Details

### Updated `app.ts` Changes
Added Swagger UI configuration:

```typescript
import swaggerUi from "swagger-ui-express";
import * as fs from "fs";
import * as yaml from "js-yaml";

// Load OpenAPI spec
let swaggerDocument: any;
try {
  const swaggerFile = fs.readFileSync("openapi.yaml", "utf8");
  swaggerDocument = yaml.load(swaggerFile);
} catch (error) {
  console.warn("⚠️ Could not load openapi.yaml, Swagger UI will not be available");
}

// Swagger UI endpoint
if (swaggerDocument) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log("✅ Swagger UI available at /api-docs");
}

// OpenAPI YAML endpoint
app.get("/openapi.yaml", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/yaml");
  res.sendFile(`${__dirname}/../openapi.yaml`);
});
```

### Added Root Endpoint
```typescript
// Root endpoint showing available endpoints
app.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "Auth Service API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      token: "/auth/token",
      userinfo: "/auth/userinfo",
      docs: "/api-docs",
      openapi: "/openapi.yaml",
    },
  });
});
```

## Verification

### Local Development
```bash
cd services/auth-service
npm install
npm run build
node dist/index.js
```

Access Swagger UI at: `http://localhost:3001/api-docs/`

### Docker Deployment
```bash
docker compose -f infrastructure/docker/docker-compose.yml up --build -d auth-service
```

Verify:
```bash
curl http://localhost:3001/api-docs/         # Should return Swagger UI HTML
curl http://localhost:3001/                  # Should return endpoints info
curl http://localhost:3001/openapi.yaml      # Should return OpenAPI spec
```

## API Endpoints Available

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Service info and available endpoints |
| POST | `/auth/token` | Get access token or refresh token |
| GET | `/auth/userinfo` | Get authenticated user information |
| POST | `/auth/validate` | Validate JWT token |
| POST | `/auth/logout` | Logout and revoke session |
| GET | `/health` | Health check endpoint |
| GET | `/api-docs` | Swagger UI documentation |
| GET | `/openapi.yaml` | OpenAPI 3.1.0 specification (YAML) |

## Testing Swagger UI

### Option 1: Web Browser
Navigate to: `http://localhost:3001/api-docs/`

### Option 2: Direct Specification Access
```bash
# Get OpenAPI spec as YAML
curl -H "Accept: application/yaml" http://localhost:3001/openapi.yaml

# Get OpenAPI spec as JSON (convert with jq)
curl http://localhost:3001/openapi.yaml | yq -o json
```

## Summary of Changes

| File | Change | Purpose |
|------|--------|---------|
| `services/auth-service/package.json` | Added 4 dependencies | Swagger UI support |
| `services/auth-service/app.ts` | Added Swagger setup + removed OTel init | Fixed double initialization |
| `services/auth-service/Dockerfile` | Added `COPY openapi.yaml` | Include spec in Docker image |

## Performance Impact
- ✅ Zero performance impact (Swagger UI loads once at startup)
- ✅ No additional database queries
- ✅ No overhead on production deployments

## Next Steps

1. **Auth Service Full Operation**
   - OpenTelemetry warnings about OIDC credentials are informational
   - Database is properly initialized
   - All endpoints ready for testing

2. **Integration Testing**
   ```bash
   npm run test:all
   ```

3. **API Testing**
   ```bash
   # Test health endpoint
   curl http://localhost:3001/health
   
   # Test token endpoint
   curl -X POST http://localhost:3001/auth/token \
     -H "Content-Type: application/json" \
     -d '{"grant_type": "authorization_code"}'
   ```

---

**Status:** ✅ **RESOLVED** - Swagger UI now fully functional for auth-service
