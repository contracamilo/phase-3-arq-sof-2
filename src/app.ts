import express, { Application, Request, Response } from "express";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    service: "Reminder Service",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Root endpoint
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "Reminders Service API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      api: "/v1/reminders",
      docs: "/openapi.yaml",
    },
  });
});

// API Routes - Try to import v2 routes, fallback to v1
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const reminderRoutesV2 = require("./routes/reminder.routes.v2").default;
  app.use("/v1/reminders", reminderRoutesV2);
  console.log("✅ Loaded v2 routes at /v1/reminders");
} catch (error) {
  console.log("⚠️  V2 routes not available, trying v1...");
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const reminderRoutes = require("./routes/reminder.routes").default;
    app.use("/api/reminders", reminderRoutes);
    console.log("✅ Loaded v1 routes at /api/reminders");
  } catch (error2) {
    console.error("❌ Failed to load routes:", error2);
  }
}

// Error handlers (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
