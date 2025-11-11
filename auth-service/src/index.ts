/**
 * Auth Service Entry Point
 * Initializes OpenTelemetry, database, and starts HTTP server
 */

import { initializeOpenTelemetry } from "./instrumentation/opentelemetry";

// Initialize OpenTelemetry FIRST (before importing anything else)
const sdk = initializeOpenTelemetry();

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  await sdk.shutdown();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully...");
  await sdk.shutdown();
  process.exit(0);
});

// Now import app and other dependencies
import app from "./app";
import pool from "./config/database";

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Test database connection
    console.log("Testing database connection...");
    const client = await pool.connect();
    await client.query("SELECT NOW()");
    client.release();
    console.log("✅ Database connected successfully");

    // Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Auth Service listening on port ${PORT}`);
      console.log(`📊 Health check available at http://localhost:${PORT}/health`);
      console.log(`🔍 Ready check available at http://localhost:${PORT}/ready`);
      console.log(
        `🔐 Auth endpoint available at http://localhost:${PORT}/auth/token`
      );
    });

    // Graceful shutdown handler
    const shutdown = async () => {
      console.log("Shutting down server...");

      server.close(async () => {
        console.log("HTTP server closed");

        try {
          await pool.end();
          console.log("Database pool closed");

          await sdk.shutdown();
          console.log("OpenTelemetry SDK shut down");

          process.exit(0);
        } catch (error) {
          console.error("Error during shutdown:", error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
startServer();
