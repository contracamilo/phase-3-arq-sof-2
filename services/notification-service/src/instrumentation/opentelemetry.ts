/**
 * OpenTelemetry Instrumentation
 * Distributed tracing, metrics, and logs for observability
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

const serviceName = process.env.OTEL_SERVICE_NAME || "notification-service";
const otlpEndpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";

/**
 * Initialize OpenTelemetry SDK
 */
export function initializeOpenTelemetry(): NodeSDK {
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: "1.0.0",
  });

  const traceExporter = new OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`,
  });

  const sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": {
          enabled: false, // Disable file system instrumentation
        },
        "@opentelemetry/instrumentation-http": {
          enabled: true,
          requestHook: (span, request) => {
            // Add custom attributes to HTTP spans
            const userAgent =
              (request as any).headers?.["user-agent"] ||
              (request as any).getHeader?.("user-agent") ||
              "unknown";
            span.setAttribute("http.user_agent", userAgent);
          },
        },
        "@opentelemetry/instrumentation-express": {
          enabled: true,
        },
        "@opentelemetry/instrumentation-pg": {
          enabled: true,
          enhancedDatabaseReporting: true,
        },
      }),
    ],
  });

  sdk.start();

  console.log("✅ OpenTelemetry instrumentation initialized");
  console.log(`Service: ${serviceName}`);
  console.log(`Exporter: ${otlpEndpoint}`);

  // Graceful shutdown
  process.on("SIGTERM", () => {
    sdk
      .shutdown()
      .then(() => console.log("OpenTelemetry shut down"))
      .catch((error) =>
        console.error("Error shutting down OpenTelemetry", error),
      )
      .finally(() => process.exit(0));
  });

  return sdk;
}

/**
 * Custom business metrics for notification service
 */
import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("notification-service");

// Counters for template operations
export const templatesCreatedCounter = meter.createCounter(
  "notification_templates_created_total",
  {
    description: "Total number of notification templates created",
    unit: "1",
  },
);

export const templatesUpdatedCounter = meter.createCounter(
  "notification_templates_updated_total",
  {
    description: "Total number of notification templates updated",
    unit: "1",
  },
);

export const templatesDeletedCounter = meter.createCounter(
  "notification_templates_deleted_total",
  {
    description: "Total number of notification templates deleted",
    unit: "1",
  },
);

export const templatesRetrievedCounter = meter.createCounter(
  "notification_templates_retrieved_total",
  {
    description: "Total number of notification templates retrieved",
    unit: "1",
  },
);

// Counters for template rendering (business value)
export const templatesRenderedCounter = meter.createCounter(
  "notification_templates_rendered_total",
  {
    description: "Total number of notification templates rendered for sending",
    unit: "1",
  },
);

// Counters for errors
export const templateOperationErrorsCounter = meter.createCounter(
  "notification_template_operation_errors_total",
  {
    description: "Total number of errors in template operations",
    unit: "1",
  },
);

// Histograms for performance
export const templateRenderingDuration = meter.createHistogram(
  "notification_template_rendering_duration",
  {
    description: "Time taken to render notification templates",
    unit: "ms",
  },
);

/**
 * Usage in application code:
 *
 * import { templatesCreatedCounter, templatesRenderedCounter } from './instrumentation/opentelemetry';
 *
 * // When creating a template
 * templatesCreatedCounter.add(1, {
 *   template_type: 'reminder',
 *   source: 'api'
 * });
 *
 * // When rendering a template for notification
 * templatesRenderedCounter.add(1, {
 *   template_code: 'REMINDER_DUE',
 *   channel: 'email'
 * });
 */