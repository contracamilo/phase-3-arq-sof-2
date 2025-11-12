/**
 * Notification Service - Main Entry Point
 * Starts the Express server and initializes components
 */

import app from "./app";
import dotenv from "dotenv";
import winston from "winston";

dotenv.config();

const PORT = process.env.PORT || 3002;

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.json(),
  defaultMeta: { service: "notification-service" },
  transports: [new winston.transports.Console()],
});

// Start server
const startServer = async () => {
  app.listen(PORT, () => {
    logger.info("Notification Service started", {
      port: PORT,
      environment: process.env.NODE_ENV || "development",
    });
    console.log(`🚀 Notification Service running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
  });
};

startServer().catch((error) => {
  logger.error("Failed to start server", { error: error.message });
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});