import { Request, Response, NextFunction } from 'express';
import { eventLogger, EventType } from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    eventLogger.log(EventType.ERROR_OCCURRED, {
      message: err.message,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method
    });

    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    });
  }

  // Unhandled errors
  console.error('💥 Unhandled Error:', err);
  
  eventLogger.log(EventType.ERROR_OCCURRED, {
    message: err.message,
    statusCode: 500,
    path: req.path,
    method: req.method,
    stack: err.stack
  });

  return res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`
  });
};
