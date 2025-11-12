# SOA Microservices - Business Metrics Monitoring

Este documento explica cómo configurar y usar el sistema de monitoring con métricas de negocio implementado en la arquitectura SOA.

## 🎯 Objetivo Académico

Demostrar cómo las métricas de negocio proporcionan valor real para entender el comportamiento del sistema y tomar decisiones informadas.

## 📊 Métricas de Negocio Implementadas

### Auth Service

- **Logins Iniciados**: `auth_logins_initiated_total`
- **Logins Exitosos**: `auth_logins_successful_total`
- **Tokens Emitidos**: `auth_tokens_issued_total`
- **Tokens Validados**: `auth_tokens_validated_total`
- **Información de Usuario Consultada**: `auth_userinfo_retrieved_total`

### Notification Service

- **Templates Creados**: `notification_templates_created_total`
- **Templates Renderizados**: `notification_templates_rendered_total`
- **Templates Actualizados**: `notification_templates_updated_total`
- **Templates Eliminados**: `notification_templates_deleted_total`
- **Duración de Renderizado**: `notification_template_rendering_duration`

### Reminder Service

- **Recordatorios Creados**: `reminders_created_total`
- **Conflictos de Idempotencia**: `idempotency_conflicts_total`
- **Duración de Procesamiento**: `reminder_processing_duration`

## 🚀 Inicio Rápido

### 1. Iniciar Servicios con Monitoring

```bash
# Desde el directorio raíz del proyecto
docker-compose -f infrastructure/docker/docker-compose.yml up -d

# Verificar que los servicios estén ejecutándose
docker ps
```

### 2. Verificar Métricas

```bash
# Auth Service
curl http://localhost:3002/metrics

# Notification Service
curl http://localhost:3001/metrics

# Reminder Service
curl http://localhost:3000/metrics
```

### 3. Acceder a Grafana

- URL: <http://localhost:3003>
- Usuario: admin
- Contraseña: admin

### 4. Importar Dashboard

1. En Grafana, ir a "Dashboards" → "Import"
2. Cargar el archivo `infrastructure/observability/grafana-dashboard.json`

## 📈 Interpretación de Métricas

### KPIs de Negocio

- **Conversión de Login**: `auth_logins_successful_total / auth_logins_initiated_total`
- **Uso de Templates**: `notification_templates_rendered_total` por tipo de template
- **Eficiencia de Recordatorios**: `reminders_created_total` vs tiempo de respuesta
- **Satisfacción de Usuario**: Ratio de operaciones exitosas vs errores

### Alertas Recomendadas

- Login failures > 5% del total
- Template rendering duration > 500ms promedio
- Token validation errors > 1%

## 🔧 Configuración Técnica

### OpenTelemetry

Cada servicio incluye instrumentación automática y métricas custom de negocio:

```typescript
// Ejemplo de uso de métricas
import { remindersCreatedCounter } from './instrumentation/opentelemetry';

remindersCreatedCounter.add(1, {
  source: 'LMS',
  status: 'pending'
});
```

### Prometheus

Configurado para recolectar métricas cada 10 segundos con etiquetas de negocio.

### Grafana

Dashboard pre-configurado mostrando métricas en tiempo real.

## 🎓 Lecciones Aprendidas

1. **Métricas de Negocio vs Técnicas**: Las métricas técnicas (CPU, memoria) son necesarias pero las de negocio muestran el valor real del sistema.

2. **Observabilidad Proactiva**: Monitorear desde la perspectiva del usuario final permite detectar problemas antes que afecten la experiencia.

3. **Trazabilidad Completa**: OpenTelemetry permite correlacionar métricas de negocio con traces técnicos para debugging efectivo.

4. **Alertas Inteligentes**: Configurar alertas basadas en KPIs de negocio, no solo en métricas técnicas.

## 📚 Recursos Adicionales

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Prometheus Metrics](https://prometheus.io/docs/concepts/metric_types/)
- [Grafana Dashboards](https://grafana.com/docs/grafana/latest/dashboards/)

## 🤝 Contribución

Para agregar nuevas métricas de negocio:

1. Definir la métrica en el archivo `instrumentation/opentelemetry.ts`
2. Integrar el contador/histograma en la lógica de negocio
3. Actualizar el dashboard de Grafana
4. Documentar el KPI en este README
