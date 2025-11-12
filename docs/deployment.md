# 🚀 Despliegue - SOA Architecture Platform

## Visión General

Esta guía cubre los procedimientos de despliegue para la plataforma SOA, desde desarrollo local hasta producción en la nube.

## 🏗️ Estrategias de Despliegue

### Entornos

#### 1. Desarrollo Local
**Propósito**: Desarrollo y testing individual de servicios

**Herramientas**:
- Docker Compose para orquestación local
- Hot reload para desarrollo rápido
- Base de datos compartida para todos los servicios

**Comandos**:
```bash
# Despliegue completo
docker compose -f infrastructure/docker/docker-compose.yml up -d --build

# Solo infraestructura (base de datos, message broker)
docker compose up postgres rabbitmq keycloak -d

# Desarrollo de un servicio específico
cd services/reminder-service && npm run dev
```

#### 2. Staging/Testing
**Propósito**: Validación de integración y testing automatizado

**Características**:
- Infraestructura efímera
- Datos de prueba
- CI/CD automatizado
- Tests de integración completos

#### 3. Producción
**Propósito**: Despliegue de la aplicación para usuarios finales

**Características**:
- Alta disponibilidad
- Escalabilidad automática
- Backup y recuperación
- Monitoreo 24/7

## 🐳 Despliegue con Docker

### Docker Compose (Desarrollo)

```yaml
# infrastructure/docker/docker-compose.yml
version: '3.8'

services:
  reminder-service:
    build:
      context: ../../services/reminder-service
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/reminders_db
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
      - NODE_ENV=development
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy

  # ... otros servicios
```

### Multi-stage Docker Builds

```dockerfile
# services/reminder-service/Dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Production stage
FROM node:18-alpine AS production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## ☁️ Despliegue en la Nube

### Azure Container Apps (Recomendado)

#### Arquitectura
```
Azure Container Apps Environment
├── Reminder Service (ACA)
├── Auth Service (ACA)
├── Notification Service (ACA)
├── PostgreSQL (Azure Database)
├── RabbitMQ (Azure Service Bus)
├── Keycloak (Azure Container App)
├── Prometheus (Azure Monitor)
└── Grafana (Azure Managed Grafana)
```

#### Configuración

```yaml
# azure.yaml (Azure Developer CLI)
name: soa-platform
services:
  reminder-service:
    project: services/reminder-service
    host: containerapp
    language: js
  auth-service:
    project: services/auth-service
    host: containerapp
    language: js
  notification-service:
    project: services/notification-service
    host: containerapp
    language: js
```

#### Comandos de Despliegue

```bash
# Inicializar Azure resources
azd init

# Provisionar infraestructura
azd provision

# Desplegar aplicación
azd deploy

# Ver estado
azd monitor
```

### Azure Kubernetes Service (AKS)

#### Para escalabilidad avanzada

```yaml
# k8s/deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: reminder-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: reminder-service
  template:
    metadata:
      labels:
        app: reminder-service
    spec:
      containers:
      - name: reminder-service
        image: soa-platform/reminder-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: connection-string
        - name: RABBITMQ_URL
          valueFrom:
            secretKeyRef:
              name: mq-secret
              key: connection-string
```

## 🔧 Configuración de Entornos

### Variables de Entorno

#### Desarrollo
```bash
# .env.development
NODE_ENV=development
LOG_LEVEL=debug
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/reminders_db
RABBITMQ_URL=amqp://guest:guest@localhost:5672
KEYCLOAK_URL=http://localhost:8080
```

#### Producción
```bash
# .env.production
NODE_ENV=production
LOG_LEVEL=info
DATABASE_URL=postgresql://user:password@prod-db:5432/reminders_db
RABBITMQ_URL=amqps://user:password@prod-mq:5672
KEYCLOAK_URL=https://auth.soa-platform.com
```

### Secrets Management

#### Azure Key Vault
```bash
# Configurar secrets
az keyvault secret set --name db-password --value "secret-password"
az keyvault secret set --name jwt-secret --value "jwt-secret-key"

# Acceder desde aplicación
const secret = await keyVaultClient.getSecret('db-password');
```

#### Docker Secrets
```yaml
services:
  reminder-service:
    secrets:
      - db_password
    environment:
      - DATABASE_PASSWORD_FILE=/run/secrets/db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

## 📊 Monitoreo y Observabilidad

### Application Insights (Azure)

```typescript
// services/reminder-service/src/instrumentation.ts
import { AzureMonitorTraceExporter } from '@azure/monitor-opentelemetry-exporter';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';

const provider = new NodeTracerProvider();
provider.addSpanProcessor(
  new BatchSpanProcessor(
    new AzureMonitorTraceExporter({
      connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
    })
  )
);
```

### Azure Monitor

```yaml
# azure-monitor-config.yml
metricNamespaces:
  - Microsoft.ContainerInstance/containerGroups
  - Microsoft.DBforPostgreSQL/servers
  - Microsoft.ServiceBus/namespaces

logs:
  - category: ContainerInstanceLogs
    enabled: true
  - category: PostgreSQLLogs
    enabled: true
```

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Azure

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Login to Azure
      uses: azure/login@v1
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }}

    - name: Build and push images
      run: |
        docker build -t reminder-service ./services/reminder-service
        az acr login --name soaacr
        docker tag reminder-service soaacr.azurecr.io/reminder-service:latest
        docker push soaacr.azurecr.io/reminder-service:latest

    - name: Deploy to Azure Container Apps
      uses: azure/container-apps-deploy@v0
      with:
        appSourcePath: ${{ github.workspace }}
        acrName: soaacr
        resourceGroup: soa-platform-rg
        environmentName: soa-platform-env
```

### Azure DevOps

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
    - main

pool:
  vmImage: 'ubuntu-latest'

stages:
- stage: Build
  jobs:
  - job: BuildServices
    steps:
    - task: Docker@2
      inputs:
        command: build
        repository: $(serviceName)
        dockerfile: services/$(serviceName)/Dockerfile

- stage: Deploy
  jobs:
  - deployment: DeployToStaging
    environment: staging
    strategy:
      runOnce:
        deploy:
          steps:
          - task: AzureContainerApps@1
            inputs:
              azureSubscription: $(azureSubscription)
              containerAppName: $(serviceName)
              resourceGroup: $(resourceGroup)
              imageName: $(containerRegistry)/$(serviceName):$(Build.BuildId)
```

## 🔒 Seguridad

### Network Security

#### Azure Virtual Network
```bash
# Crear VNet
az network vnet create \
  --resource-group soa-platform-rg \
  --name soa-vnet \
  --address-prefix 10.0.0.0/16

# Configurar subnets
az network vnet subnet create \
  --resource-group soa-platform-rg \
  --vnet-name soa-vnet \
  --name apps-subnet \
  --address-prefix 10.0.1.0/24
```

#### Azure Firewall
```bash
# Configurar reglas de firewall
az network firewall policy rule-collection-group collection add-filter-collection \
  --resource-group soa-platform-rg \
  --policy-name soa-firewall-policy \
  --name api-rules \
  --priority 100 \
  --action Allow \
  --rule-name allow-api \
  --rule-type NetworkRule \
  --destination-ports 80 443 \
  --source-addresses "*" \
  --destination-addresses "$(api-ip)"
```

### Application Security

#### API Security
- JWT tokens para autenticación
- Rate limiting por IP y usuario
- CORS configurado restrictivamente
- Input validation y sanitización

#### Container Security
```dockerfile
# Usar usuario no-root
FROM node:18-alpine
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# No instalar dependencias de desarrollo en producción
RUN npm ci --only=production
```

## 📈 Escalabilidad y Performance

### Auto-scaling

#### Azure Container Apps
```yaml
# Configuración de escalado
scale:
  minReplicas: 1
  maxReplicas: 10
  rules:
  - name: http-scaling
    http:
      metadata:
        concurrentRequests: '10'
```

#### Kubernetes HPA
```yaml
# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: reminder-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: reminder-service
  minReplicas: 1
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Database Scaling

#### Azure Database for PostgreSQL
```bash
# Escalar verticalmente
az postgres server update \
  --resource-group soa-platform-rg \
  --name soa-postgres \
  --sku-name GP_Gen5_8

# Configurar read replicas
az postgres server replica create \
  --resource-group soa-platform-rg \
  --name soa-postgres-replica \
  --source-server soa-postgres
```

## 🔄 Backup y Disaster Recovery

### Database Backup

```bash
# Backup automático con Azure
az postgres server update \
  --resource-group soa-platform-rg \
  --name soa-postgres \
  --backup-retention 30

# Backup manual
pg_dump -h soa-postgres.postgres.database.azure.com \
  -U admin@soa-postgres \
  -d reminders_db > backup.sql
```

### Application Backup

```yaml
# Azure Backup para Container Apps
az backup protection enable-for-azurewl \
  --resource-group soa-platform-rg \
  --vault-name soa-backup-vault \
  --item-name reminder-service \
  --workload-type AzureVM \
  --policy-name DefaultPolicy
```

## 📋 Checklist de Despliegue

### Pre-despliegue
- [ ] Tests pasan en todos los servicios
- [ ] Imágenes Docker construidas y probadas
- [ ] Variables de entorno configuradas
- [ ] Secrets almacenados de forma segura
- [ ] Base de datos migrada
- [ ] Keycloak configurado

### Durante despliegue
- [ ] Infraestructura provisionada
- [ ] Servicios desplegados en orden correcto
- [ ] Health checks pasan
- [ ] Logs verificados
- [ ] Métricas funcionando

### Post-despliegue
- [ ] Tests de integración ejecutados
- [ ] Monitoreo configurado
- [ ] Alertas activas
- [ ] Documentación actualizada
- [ ] Equipo notificado

## 🚨 Troubleshooting

### Problemas Comunes

#### Servicio no inicia
```bash
# Ver logs del contenedor
docker logs reminder-service

# Verificar dependencias
docker compose ps

# Verificar variables de entorno
docker exec reminder-service env
```

#### Conexión a base de datos falla
```bash
# Verificar conectividad
telnet postgres 5432

# Verificar credenciales
psql -h postgres -U postgres -d reminders_db

# Ver logs de PostgreSQL
docker logs postgres
```

#### Alto uso de CPU/Memoria
```bash
# Verificar métricas
curl http://localhost:9090/metrics

# Ver procesos del contenedor
docker exec reminder-service ps aux

# Configurar límites de recursos
docker update --cpus 0.5 --memory 512m reminder-service
```

---

**📖 Documentación Relacionada**
- [Guía de Inicio](getting-started.md) - Cómo ejecutar la plataforma
- [Arquitectura](architecture.md) - Diseño del sistema
- [Testing](testing.md) - Estrategia de testing completa
- [Documentación de Servicios](services/) - Detalles específicos de cada servicio