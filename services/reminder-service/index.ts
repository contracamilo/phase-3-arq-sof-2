import app from "./app";
import pool from "./config/database";
import dotenv from "dotenv";
import { initializeOpenTelemetry } from "./instrumentation/opentelemetry";
import { initRabbitMQ } from "./integration/messaging/rabbitmq.publisher";
import { scheduleIdempotencyCleanup } from "./middleware/idempotency.middleware";

dotenv.config();

const PORT = process.env.PORT || 3000;

// Initialize OpenTelemetry (must be first)
initializeOpenTelemetry();

// Test database connection
const testDatabaseConnection = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Database connected successfully");
    client.release();
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
};

// Initialize SOA components
const initializeSOAComponents = async () => {
  try {
    // Initialize RabbitMQ
    await initRabbitMQ();
    console.log("✅ RabbitMQ initialized");

    // Start Camunda worker (imported dynamically to avoid startup issues)
    if (process.env.ZEEBE_GATEWAY_ADDRESS) {
      try {
        // Import Camunda service dynamically
        const { camundaService } = await import("./services/camunda.service");
        console.log("✅ Camunda service initialized");
      } catch (error) {
        console.warn(
          "⚠️  Camunda service initialization failed:",
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    } else {
      console.log(
        "ℹ️  Camunda integration disabled (ZEEBE_GATEWAY_ADDRESS not set)",
      );
    }

    // Schedule idempotency cleanup
    scheduleIdempotencyCleanup();
    console.log("✅ Idempotency cleanup scheduled");
  } catch (error) {
    console.error("❌ SOA components initialization failed:", error);
    // Don't exit - service can still run without SOA components
  }
};

// Start server
const startServer = async () => {
  await testDatabaseConnection();
  await initializeSOAComponents();

  app.listen(PORT, () => {
    console.log(`🚀 Reminder Service running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`📍 API endpoint: http://localhost:${PORT}/v1/reminders`);
    console.log(`📍 OpenAPI spec: http://localhost:${PORT}/openapi.yaml`);
  });
};

startServer().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
