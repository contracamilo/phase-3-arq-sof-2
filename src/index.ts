import app from './app';
import pool from './config/database';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

// Test database connection
const testDatabaseConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  await testDatabaseConnection();

  app.listen(PORT, () => {
    console.log(`🚀 Reminder Service running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`📍 API endpoint: http://localhost:${PORT}/api/reminders`);
  });
};

startServer();
