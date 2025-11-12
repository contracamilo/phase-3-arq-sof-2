/**
 * Notification Service - Express Application
 * Handles notification templates and delivery management
 */

import express, { Express, Request, Response } from "express";
import cors from "cors";
import winston from "winston";
import notificationRoutes from "./routes/notification.routes";

const app: Express = express();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.json(),
  defaultMeta: { service: "notification-service" },
  transports: [new winston.transports.Console()],
});

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