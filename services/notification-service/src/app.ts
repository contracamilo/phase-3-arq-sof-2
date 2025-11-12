/**
 * Notification Service - Express Application
 * Handles notification templates and delivery management
 */

import express, { Express, Request, Response } from "express";
import cors from "cors";
import winston from "winston";
import swaggerUi from "swagger-ui-express";
import * as fs from "fs";
import * as yaml from "js-yaml";
import notificationRoutes from "./routes/notification.routes";

const app: Express = express();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.json(),
  defaultMeta: { service: "notification-service" },
  transports: [new winston.transports.Console()],
});

// Load OpenAPI spec
let swaggerDocument: any;
try {
  const swaggerFile = fs.readFileSync(`${__dirname}/../openapi.yaml`, "utf8");
  swaggerDocument = yaml.load(swaggerFile);
} catch (error) {
  console.warn("⚠️ Could not load openapi.yaml, Swagger UI will not be available");
}

// Middleware: CORS
const corsOptions = {
  origin: (process.env.CORS_ORIGIN || "http://localhost:3000").split(","),
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Middleware: Request parsing
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Middleware: Request logging
app.use((req: Request, res: Response, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info("HTTP Request", {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
    });
  });

  next();
});

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "notification-service",
    timestamp: new Date().toISOString(),
  });
});

// Ready check endpoint
app.get("/ready", async (_req: Request, res: Response) => {
  // In production, add database health check
  res.json({
    ready: true,
    service: "notification-service",
  });
});

// Root endpoint
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    message: "Notification Service API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      ready: "/ready",
      notifications: "/notifications",
      docs: "/api-docs",
      openapi: "/openapi.yaml",
    },
  });
});

// Swagger UI
if (swaggerDocument) {
  app.use("/api-docs", swaggerUi.serve as any, swaggerUi.setup(swaggerDocument) as any);
  console.log("✅ Swagger UI available at /api-docs");
}

// OpenAPI YAML endpoint
app.get("/openapi.yaml", (_req: Request, res: Response) => {
  try {
    const yamlContent = fs.readFileSync(`${__dirname}/../openapi.yaml`, "utf8");
    res.setHeader("Content-Type", "application/yaml");
    res.send(yamlContent);
  } catch (error) {
    res.status(500).json({
      error: "internal_server_error",
      error_description: "Could not load OpenAPI specification",
      status_code: 500,
      timestamp: new Date().toISOString(),
    });
  }
});

// Routes
app.use("/notifications", notificationRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "not_found",
    error_description: `Route ${req.method} ${req.path} not found`,
    status_code: 404,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use(
  (
    err: Error & { status?: number; statusCode?: number },
    _req: Request,
    res: Response,
    _next: any
  ) => {
    const status = err.status || err.statusCode || 500;

    logger.error("Unhandled error", {
      message: err.message,
      stack: err.stack,
      status,
      path: _req.path,
    });

    res.status(status).json({
      error: "internal_server_error",
      error_description: err.message,
      status_code: status,
      timestamp: new Date().toISOString(),
    });
  }
);

export default app;