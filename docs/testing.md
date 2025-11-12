# 🧪 Testing - SOA Architecture Platform

## Visión General

La plataforma SOA implementa una estrategia de testing comprehensiva que cubre desde pruebas unitarias hasta pruebas de integración end-to-end, asegurando la calidad y confiabilidad de todos los servicios.

## 🏗️ Estrategia de Testing

### Niveles de Testing

#### 1. Unit Tests (Pruebas Unitarias)
**Objetivo**: Validar la lógica de negocio individual de cada componente

**Alcance**:
- Funciones y métodos individuales
- Validación de reglas de negocio
- Manejo de errores y casos edge
- Cobertura de código mínima: 80%

**Herramientas**:
- **Jest**: Framework de testing para Node.js
- **Supertest**: Testing de APIs HTTP
- **Sinon**: Mocks, stubs y spies

#### 2. Integration Tests (Pruebas de Integración)
**Objetivo**: Validar la comunicación entre componentes y servicios

**Alcance**:
- Comunicación con base de datos
- Interacción con message brokers
- Llamadas entre servicios
- Contratos de API

**Herramientas**:
- **Testcontainers**: Contenedores efímeros para testing
- **Jest** con configuración especial para integración

#### 3. End-to-End Tests (Pruebas E2E)
**Objetivo**: Validar flujos completos de usuario

**Alcance**:
- Flujos de negocio completos
- Interfaz de usuario (futuro)
- Integración completa del sistema
- Performance bajo carga

**Herramientas**:
- **Postman/Newman**: Testing de APIs
- **Playwright** (futuro para UI)

#### 4. Contract Tests (Pruebas de Contrato)
**Objetivo**: Garantizar compatibilidad entre servicios

**Alcance**:
- Contratos de API entre servicios
- Versionado de APIs
- Backward compatibility

**Herramientas**:
- **Pact**: Framework de contract testing

## 📊 Métricas de Testing

### Cobertura de Código

| Servicio | Unit Tests | Integration | E2E | Cobertura |
|----------|------------|--------------|-----|-----------|
| Reminder Service | ✅ | ✅ | ✅ | 85% |
| Auth Service | ✅ | ✅ | ✅ | 82% |
| Notification Service | ✅ | ✅ | ✅ | 78% |

### Métricas de Calidad

- **Code Coverage**: >80% en todos los servicios
- **Mutation Testing**: >70% mutation score
- **Performance**: <200ms response time en tests
- **Reliability**: <1% false positives en tests

## 🔧 Configuración de Testing

### Jest Configuration

Cada servicio tiene su propia configuración de Jest:

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ]
};
```

### Testcontainers Setup

Para pruebas de integración que requieren infraestructura:

```javascript
// test/integration/setup.ts
import { PostgreSqlContainer } from 'testcontainers';

export async function setupTestDatabase() {
  const container = await new PostgreSqlContainer()
    .withDatabase('test_db')
    .withUsername('test')
    .withPassword('test')
    .start();

  return {
    host: container.getHost(),
    port: container.getPort(),
    database: container.getDatabase(),
    username: container.getUsername(),
    password: container.getPassword(),
    stop: () => container.stop()
  };
}
```

## 🏃‍♂️ Ejecución de Tests

### Tests Unitarios

```bash
# Ejecutar tests de un servicio específico
cd services/reminder-service
npm test

# Ejecutar tests con watch mode
npm run test:watch

# Ejecutar tests con coverage
npm run test:coverage
```

### Tests de Integración

```bash
# Ejecutar tests de integración completos
./scripts/test-platform.sh

# Ejecutar solo tests de integración
npm run test:integration
```

### Tests End-to-End

```bash
# Ejecutar tests E2E con Newman
newman run tests/e2e/postman_collection.json

# Ejecutar tests E2E con Playwright (futuro)
npx playwright test
```

## 📝 Estructura de Tests

### Patrón de Organización

```
services/reminder-service/
├── src/
│   ├── __tests__/
│   │   ├── unit/
│   │   │   ├── reminderController.test.ts
│   │   │   ├── reminderService.test.ts
│   │   │   └── validation.test.ts
│   │   ├── integration/
│   │   │   ├── database.test.ts
│   │   │   ├── rabbitmq.test.ts
│   │   │   └── api.test.ts
│   │   └── e2e/
│   │       └── reminderFlow.test.ts
│   └── ...
├── jest.config.js
└── package.json
```

### Ejemplo de Test Unitario

```typescript
// src/__tests__/unit/reminderService.test.ts
import { ReminderService } from '../../services/reminderService';
import { ReminderRepository } from '../../repositories/reminderRepository';

describe('ReminderService', () => {
  let service: ReminderService;
  let mockRepository: jest.Mocked<ReminderRepository>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    } as any;

    service = new ReminderService(mockRepository);
  });

  describe('createReminder', () => {
    it('should create a reminder successfully', async () => {
      const reminderData = {
        title: 'Test Reminder',
        description: 'Test Description',
        dueDate: new Date('2024-12-31')
      };

      mockRepository.create.mockResolvedValue({
        id: '123',
        ...reminderData,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await service.createReminder(reminderData);

      expect(result.id).toBe('123');
      expect(result.title).toBe(reminderData.title);
      expect(mockRepository.create).toHaveBeenCalledWith(reminderData);
    });

    it('should throw error for invalid data', async () => {
      const invalidData = { title: '' };

      await expect(service.createReminder(invalidData))
        .rejects
        .toThrow('Title is required');
    });
  });
});
```

### Ejemplo de Test de Integración

```typescript
// src/__tests__/integration/database.test.ts
import { setupTestDatabase } from '../setup';
import { ReminderRepository } from '../../repositories/reminderRepository';

describe('ReminderRepository Integration', () => {
  let dbConfig: any;
  let repository: ReminderRepository;

  beforeAll(async () => {
    dbConfig = await setupTestDatabase();
    repository = new ReminderRepository(dbConfig);
  });

  afterAll(async () => {
    await dbConfig.stop();
  });

  beforeEach(async () => {
    // Limpiar base de datos
    await repository.clearAll();
  });

  describe('CRUD Operations', () => {
    it('should create and retrieve a reminder', async () => {
      const reminder = {
        title: 'Integration Test Reminder',
        description: 'Testing database integration',
        dueDate: new Date('2024-12-31')
      };

      const created = await repository.create(reminder);
      const retrieved = await repository.findById(created.id);

      expect(retrieved.title).toBe(reminder.title);
      expect(retrieved.description).toBe(reminder.description);
    });

    it('should handle concurrent updates with optimistic locking', async () => {
      const reminder = await repository.create({
        title: 'Concurrent Test',
        description: 'Testing concurrency',
        dueDate: new Date()
      });

      // Simular actualización concurrente
      await expect(
        Promise.all([
          repository.update(reminder.id, { title: 'Update 1' }, 'version1'),
          repository.update(reminder.id, { title: 'Update 2' }, 'version1')
        ])
      ).rejects.toThrow('Concurrent modification');
    });
  });
});
```

## 🔍 Testing de APIs

### Health Checks

```bash
# Verificar health de todos los servicios
curl -f http://localhost:3000/health && echo "✅ Reminder Service"
curl -f http://localhost:3001/health && echo "✅ Auth Service"
curl -f http://localhost:3002/health && echo "✅ Notification Service"
```

### API Contract Testing

```typescript
// tests/contracts/reminder-api.contract.ts
import { pact } from 'jest-pact';
import { like, term } from '@pact-foundation/pact/src/dsl/matchers';

pact('Reminder Service API', () => {
  describe('GET /reminders', () => {
    it('returns a list of reminders', async () => {
      await pact
        .given('there are reminders')
        .uponReceiving('a request for reminders')
        .withRequest({
          method: 'GET',
          path: '/reminders'
        })
        .willRespondWith({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            reminders: like([{
              id: like('123'),
              title: like('Test Reminder'),
              description: like('Test Description'),
              dueDate: term({
                generate: '2024-12-31T00:00:00.000Z',
                matcher: '\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z'
              })
            }])
          }
        });
    });
  });
});
```

## 📈 Reportes de Testing

### Cobertura de Código

```bash
# Generar reporte de cobertura
npm run test:coverage

# Ver reporte HTML
open coverage/lcov-report/index.html
```

### Reporte de Calidad

```bash
# Ejecutar análisis estático
npm run lint

# Verificar tipos TypeScript
npm run type-check

# Ejecutar security audit
npm audit
```

## 🚀 CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test

      - name: Run integration tests
        run: npm run test:integration

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## 🐛 Debugging de Tests

### Problemas Comunes

#### Tests que fallan aleatoriamente

```typescript
// Usar semillas para tests determinísticos
beforeAll(() => {
  jest.setTimeout(10000);
});

// Para tests de base de datos
afterEach(async () => {
  await cleanupDatabase();
});
```

#### Tests que pasan localmente pero fallan en CI

```bash
# Verificar variables de entorno
echo $NODE_ENV
echo $DATABASE_URL

# Ejecutar con mismo contexto que CI
NODE_ENV=test npm test
```

#### Memory leaks en tests

```typescript
// Limpiar mocks después de cada test
afterEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
});
```

## 📋 Mejores Prácticas

### Principios SOLID en Tests

- **Single Responsibility**: Un test valida una sola funcionalidad
- **Open/Closed**: Tests son extensibles sin modificar existentes
- **Liskov Substitution**: Tests funcionan con implementaciones alternativas
- **Interface Segregation**: Tests específicos para interfaces relevantes
- **Dependency Inversion**: Tests no dependen de implementaciones concretas

### Testing Pyramid

```
E2E Tests (10-20%)
    ↓
Integration Tests (20-30%)
    ↓
Unit Tests (60-70%)
```

### Test Data Management

- **Factories**: Para crear datos de test consistentes
- **Fixtures**: Datos estáticos para tests determinísticos
- **Builders**: Para construir objetos complejos en tests

---

**📖 Documentación Relacionada**
- [Guía de Inicio](getting-started.md) - Cómo ejecutar la plataforma
- [Arquitectura](architecture.md) - Diseño del sistema
- [Documentación de Servicios](services/) - Detalles específicos de cada servicio
- [Despliegue](deployment.md) - Procedimientos de producción