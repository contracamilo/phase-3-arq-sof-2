/**
 * OpenTelemetry Instrumentation
 * Distributed tracing, metrics, and logs for observability
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

const serviceName = process.env.OTEL_SERVICE_NAME || "reminders-service";
const otlpEndpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";

/**
 * Initialize OpenTelemetry SDK
 */
export function initializeOpenTelemetry(): NodeSDK {
  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: "1.0.0",
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
        process.env.NODE_ENV || "development",
    }),

    // Trace exporter
    traceExporter: new OTLPTraceExporter({
      url: `${otlpEndpoint}/v1/traces`,
    }),

    // Metric exporter
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: `${otlpEndpoint}/v1/metrics`,
      }),
      exportIntervalMillis: 60000, // Export every minute
    }),

    // Auto-instrumentations
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
 * Custom metrics for business events
 */
import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("reminders-service");

// Counters
export const remindersCreatedCounter = meter.createCounter(
  "reminders_created_total",
  {
    description: "Total number of reminders created",
    unit: "1",
  },
);

export const remindersNotifiedCounter = meter.createCounter(
  "reminders_notified_total",
  {
    description: "Total number of reminders notified",
    unit: "1",
  },
);

export const idempotencyConflictsCounter = meter.createCounter(
  "idempotency_conflicts_total",
  {
    description: "Total number of idempotency conflicts",
    unit: "1",
  },
);

// Histograms
export const reminderProcessingDuration = meter.createHistogram(
  "reminder_processing_duration",
  {
    description: "Time taken to process reminders",
    unit: "ms",
  },
);

/**
 * Usage in application code:
 *
 * import { remindersCreatedCounter } from './instrumentation/opentelemetry';
 *
 * remindersCreatedCounter.add(1, {
 *   source: 'LMS',
 *   status: 'pending'
 * });
 */
