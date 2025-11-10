import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';
import { CreateReminderDto, UpdateReminderDto } from '../models/reminder.model';

export const validateCreateReminder = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { title, due_date, status } = req.body as CreateReminderDto;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return next(new AppError('Title is required and must be a non-empty string', 400));
  }

  if (!due_date) {
    return next(new AppError('Due date is required', 400));
  }

  const dueDate = new Date(due_date);
  if (isNaN(dueDate.getTime())) {
    return next(new AppError('Invalid due date format', 400));
  }

  if (status && !['pending', 'completed', 'cancelled'].includes(status)) {
    return next(new AppError('Status must be one of: pending, completed, cancelled', 400));
  }

  next();
};

export const validateUpdateReminder = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { title, due_date, status } = req.body as UpdateReminderDto;

  if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
    return next(new AppError('Title must be a non-empty string', 400));
  }

  if (due_date !== undefined) {
    const dueDate = new Date(due_date);
    if (isNaN(dueDate.getTime())) {
      return next(new AppError('Invalid due date format', 400));
    }
  }

  if (status !== undefined && !['pending', 'completed', 'cancelled'].includes(status)) {
    return next(new AppError('Status must be one of: pending, completed, cancelled', 400));
  }

  // At least one field must be provided
  if (title === undefined && due_date === undefined && status === undefined && req.body.description === undefined) {
    return next(new AppError('At least one field must be provided for update', 400));
  }

  next();
};

export const validateUUID = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(id)) {
    return next(new AppError('Invalid UUID format', 400));
  }

  next();
};
