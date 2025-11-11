/**
 * Express Application Setup
 * Middleware, routes, and global error handling
 */

import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import winston from "winston";
import { initializeOpenTelemetry } from "./instrumentation/opentelemetry";
import authRoutes from "./routes/auth.routes";

// Initialize OpenTelemetry
initializeOpenTelemetry();

const app: Express = express();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.json(),
  defaultMeta: { service: "auth-service" },
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

// Middleware: Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || "60000"),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
  message: "Too many requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Middleware: Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
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
    service: "auth-service",
    timestamp: new Date().toISOString(),
  });
});

// Ready check endpoint
app.get("/ready", async (_req: Request, res: Response) => {
  // In production, add database health check
  res.json({
    ready: true,
    service: "auth-service",
  });
});

// Routes
app.use("/auth", authRoutes);

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
    _next: NextFunction
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
