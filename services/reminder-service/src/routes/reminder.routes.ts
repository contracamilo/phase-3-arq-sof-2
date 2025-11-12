import { Router, Request, Response, NextFunction } from "express";
import { reminderService } from "../services/reminder.service";
import { CreateReminderDTO, UpdateReminderDTO } from "../models/reminder.model";
import { NotFoundError } from "../middleware/error.middleware";
import {
  validateCreateReminder,
  validateUpdateReminder,
  validateUUID,
} from "../middleware/validation.middleware";

const router = Router();

/**
 * POST /api/reminders
 * Create a new reminder
 * Supports idempotency via Idempotency-Key header
 */
router.post(
  "/",
  validateCreateReminder,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data: CreateReminderDTO = req.body;
      const idempotencyKey = req.headers["idempotency-key"] as
        | string
        | undefined;

      const reminder = await reminderService.createReminder(
        data,
        idempotencyKey,
      );

      res.status(201).json({
        status: "success",
        data: reminder,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/reminders
 * Get all reminders
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reminders = await reminderService.getAllReminders();

    res.status(200).json({
      status: "success",
      count: reminders.length,
      data: reminders,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reminders/:id
 * Get a reminder by ID
 */
router.get(
  "/:id",
  validateUUID,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const reminder = await reminderService.getReminderById(id);

      if (!reminder) {
        return next(new NotFoundError("Reminder not found", req.path));
      }

      res.status(200).json({
        status: "success",
        data: reminder,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PUT /api/reminders/:id
 * Update a reminder by ID
 */
router.put(
  "/:id",
  validateUUID,
  validateUpdateReminder,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data: UpdateReminderDTO = req.body;

      const reminder = await reminderService.updateReminder(id, data);

      if (!reminder) {
        return next(new NotFoundError("Reminder not found", req.path));
      }

      res.status(200).json({
        status: "success",
        data: reminder,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /api/reminders/:id
 * Delete a reminder by ID
 */
router.delete(
  "/:id",
  validateUUID,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const deleted = await reminderService.deleteReminder(id);

      if (!deleted) {
        return next(new NotFoundError("Reminder not found", req.path));
      }

      res.status(200).json({
        status: "success",
        message: "Reminder deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
