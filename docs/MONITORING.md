# 📊 Guía de Monitoreo y Observabilidad

Configuración y uso de Prometheus, Jaeger y otras herramientas de observabilidad.

## 🏗️ Arquitectura de Observabilidad

```
Servicios (Reminder, Auth, Notification)
         ↓
OpenTelemetry SDK
         ↓ (OTLP Protocol)
         ├→ Jaeger Collector (Tracing)
         ├→ Prometheus (Métricas)
         └→ Logs (Console/File)
         ↓
         ├→ Jaeger UI (http://localhost:16686)
         ├→ Prometheus UI (http://localhost:9090)
         └→ Logs en Docker
```

## 📈 Prometheus

### Acceso

```
http://localhost:9090
```

### Métricas Disponibles

Todos los servicios exponen métricas en `/metrics`:

```bash
# Reminder Service
curl http://localhost:3000/metrics

# Auth Service
curl http://localhost:3001/metrics

# Notification Service
curl http://localhost:3002/metrics
```

### Métricas Personalizadas

**HTTP Requests:**
- `http_requests_total` - Total de requests
- `http_request_duration_ms` - Duración de request
- `http_requests_in_progress` - Requests activos

**Base de Datos:**
- `db_connection_pool_size` - Conexiones activas
- `db_query_duration_ms` - Tiempo de queries
- `db_errors_total` - Errores de BD

**RabbitMQ:**
- `rabbitmq_messages_published_total` - Mensajes publicados
- `rabbitmq_messages_consumed_total` - Mensajes consumidos
- `rabbitmq_message_processing_duration_ms` - Tiempo de procesamiento

### Queries Útiles

```promql
# Tasa de requests por segundo
rate(http_requests_total[1m])

# Latencia p95
histogram_quantile(0.95, http_request_duration_ms)

# Tasa de errores
rate(http_requests_total{status=~"5.."}[5m])

# Conexiones de BD activas
db_connection_pool_size

# Mensajes en cola
rabbitmq_queue_length
```

### Alertas Recomendadas

Crear en `prometheus.yml`:

```yaml
groups:
  - name: microservices
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "Tasa de errores alta en {{ $labels.service }}"

      - alert: SlowResponse
        expr: histogram_quantile(0.95, http_request_duration_ms) > 1000
        for: 5m
        annotations:
          summary: "Respuestas lentas en {{ $labels.service }}"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        annotations:
          summary: "Servicio {{ $labels.instance }} está caído"
```

## 🔍 Jaeger (Tracing Distribuido)

### Acceso

```
http://localhost:16686
```

### Configuración OpenTelemetry

Ubicación: `src/instrumentation/opentelemetry.ts`

```typescript
// Configurar exportador OTLP
const otlpExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317'
});

// Agregar span processor
tracerProvider.addSpanProcessor(
  new BatchSpanProcessor(otlpExporter)
);
```

### Rastrear Requests

```typescript
// Los middleware automáticamente rastrea requests
// Ubicación: src/middleware/

// Para agregar spans personalizados:
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('my-service');

const span = tracer.startSpan('operation-name', {
  attributes: {
    'db.name': 'reminders',
    'db.operation': 'insert'
  }
});

try {
  // Tu operación
  span.setStatus({ code: SpanStatusCode.OK });
} catch (error) {
  span.recordException(error);
  span.setStatus({ code: SpanStatusCode.ERROR });
} finally {
  span.end();
}
```

### Visualizar Traces

1. Abre http://localhost:16686
2. Selecciona servicio en dropdown
3. Haz una request: `curl http://localhost:3000/api/reminders`
4. Ve el trace en Jaeger
5. Click en servicios para ver dependencias

### Traces Comunes

**Crear Reminder:**
```
reminder-service → POST /api/reminders
  ├─ Validación (validation middleware)
  ├─ DB Insert (PostgreSQL)
  └─ RabbitMQ Publish (mensaje "reminder_due")
```

**Autenticar:**
```
auth-service → POST /api/auth/login
  ├─ Validación (validation middleware)
  ├─ DB Query (PostgreSQL)
  ├─ JWT Generation
  └─ Response
```

## 📝 Logging

### Niveles de Log

```
ERROR   - Errores críticos
WARN    - Advertencias
INFO    - Información general
DEBUG   - Debugging (verbose)
TRACE   - Ultra verbose (no recomendado en prod)
```

### Cambiar Nivel

En `.env`:

```bash
LOG_LEVEL=debug
```

O en Docker:

```bash
docker run -e LOG_LEVEL=debug reminder-service
```

### Formato de Logs

```json
{
  "timestamp": "2025-11-11T10:30:45.123Z",
  "level": "INFO",
  "service": "auth-service",
  "message": "User logged in successfully",
  "traceId": "abc123...",
  "userId": "user-456",
  "duration": 250
}
```

### Filtrar Logs

```bash
# Errores solamente
docker logs auth-service | grep ERROR

# Logs de un usuario
docker logs reminder-service | grep "userId=user-456"

# Últimos 100 líneas
docker logs --tail 100 auth-service

# Tiempo real
docker logs -f reminder-service
```

## 🔗 Correlación de Traces

### TraceID Global

Cada request tiene un `traceId` único que se propaga a través de servicios:

```
Client Request
  ↓ (Headers: traceparent: 00-abc123...-def456...-01)
Reminder Service (traceId: abc123...)
  ↓ (Propaga traceId)
Auth Service (traceId: abc123...)
  ↓ (Propaga traceId)
PostgreSQL Query (traceId: abc123...)
```

### En Logs

```bash
# Buscar todos los logs de un trace
docker logs reminder-service | grep "traceId=abc123..."
```

### En Jaeger

El traceId aparece en Jaeger UI bajo "Trace ID" en cada trace.

## ⚡ Performance Monitoring

### Métricas Clave

```
1. Latencia (P50, P95, P99)
   - HTTP requests
   - Database queries
   - RabbitMQ message processing

2. Throughput (requests/segundo)
   - Por servicio
   - Por endpoint

3. Error Rate
   - Total errors
   - Por tipo (5xx, 4xx)

4. Recursos
   - CPU usage
   - Memory usage
   - DB connections
```

### Dashboard de Prometheus

Crear dashboard personalizado:

1. Abre http://localhost:9090/graph
2. Agrega queries (ver sección Prometheus arriba)
3. Exporta o guarda

O usa Grafana (opcional):

```bash
docker run -d -p 3000:3000 grafana/grafana
# Acceso: http://localhost:3000
# Conectar data source: http://prometheus:9090
```

## 🚨 Alerts y Notificaciones

### Prometheus Alertmanager

Configurar notificaciones a Slack, Email, etc:

```yaml
# prometheus.yml
global:
  resolve_timeout: 5m

route:
  receiver: 'slack'
  group_by: ['alertname', 'cluster']

receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/...'
        channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ .CommonAnnotations.summary }}'
```

## 📊 Health Checks

### Endpoints de Salud

```bash
# Reminder Service
curl http://localhost:3000/health

# Auth Service
curl http://localhost:3001/health

# Notification Service
curl http://localhost:3002/health
```

### Respuesta

```json
{
  "status": "healthy",
  "service": "reminder-service",
  "version": "1.0.0",
  "uptime": 3600,
  "database": "connected",
  "rabbitmq": "connected",
  "timestamp": "2025-11-11T10:30:45Z"
}
```

### Health Check Automático

Los servicios exponen `/health` para Kubernetes/Load Balancers:

```bash
# Kubernetes probe
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10
```

## 🔄 Troubleshooting

### Jaeger no recibe traces

```bash
# Verificar endpoint OTLP
curl http://localhost:4317

# Verificar en logs
docker logs jaeger

# Verificar en servicio
docker logs reminder-service | grep -i jaeger
```

### Prometheus sin métricas

```bash
# Verificar endpoint /metrics
curl http://localhost:3000/metrics

# Verificar configuración
cat prometheus.yml

# Reiniciar
docker restart prometheus
```

### Logs no aparecen en Docker

```bash
# Ver logs
docker logs -f reminder-service

# Aumentar verbosidad
docker exec reminder-service kill -USR1 1

# Cambiar nivel
docker exec reminder-service env LOG_LEVEL=debug
```

## 📚 Recursos

- [OpenTelemetry Docs](https://opentelemetry.io/docs/)
- [Jaeger Docs](https://www.jaegertracing.io/docs/)
- [Prometheus Docs](https://prometheus.io/docs/)
- [Prometheus Query Language](https://prometheus.io/docs/prometheus/latest/querying/basics/)

---

**Actualizado:** 11 Nov 2025
**Versión:** 1.0.0
