import { Request, Response, NextFunction } from "express";
import { ValidationError } from "./error.middleware";
import { CreateReminderDTO, UpdateReminderDTO } from "../models/reminder.model";

export const validateCreateReminder = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { title, dueAt } = req.body as CreateReminderDTO;

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return next(
      new ValidationError(
        "Title is required and must be a non-empty string",
        req.path,
      ),
    );
  }

  if (!dueAt) {
    return next(new ValidationError("Due date is required", req.path));
  }

  const dueDate = new Date(dueAt);
  if (isNaN(dueDate.getTime())) {
    return next(new ValidationError("Invalid due date format", req.path));
  }

  next();
};

export const validateUpdateReminder = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { title, dueAt, status } = req.body as UpdateReminderDTO;

  if (
    title !== undefined &&
    (typeof title !== "string" || title.trim().length === 0)
  ) {
    return next(
      new ValidationError("Title must be a non-empty string", req.path),
    );
  }

  if (dueAt !== undefined) {
    const dueDate = new Date(dueAt);
    if (isNaN(dueDate.getTime())) {
      return next(new ValidationError("Invalid due date format", req.path));
    }
  }

  if (
    status !== undefined &&
    !["pending", "scheduled", "notified", "completed", "cancelled"].includes(
      status,
    )
  ) {
    return next(
      new ValidationError(
        "Status must be one of: pending, scheduled, notified, completed, cancelled",
        req.path,
      ),
    );
  }

  // At least one field must be provided
  if (
    title === undefined &&
    dueAt === undefined &&
    status === undefined &&
    req.body.advanceMinutes === undefined &&
    req.body.metadata === undefined
  ) {
    return next(
      new ValidationError(
        "At least one field must be provided for update",
        req.path,
      ),
    );
  }

  next();
};

export const validateUUID = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { id } = req.params;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(id)) {
    return next(new ValidationError("Invalid UUID format", req.path));
  }

  next();
};
