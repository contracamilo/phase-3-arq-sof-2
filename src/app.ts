import express, { Application } from 'express';
import reminderRoutes from './routes/reminder.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'Reminder Service',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/reminders', reminderRoutes);

// Error handlers (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
