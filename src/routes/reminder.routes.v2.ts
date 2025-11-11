/**
 * Reminder Routes - REST API Endpoints
 * Implements OpenAPI specification with validation
 */

import { Router } from 'express';
import { reminderService } from '../services/reminder.service';
import { ReminderServiceV2 } from '../services/reminder.service.v2';
import { asyncHandler } from '../middleware/error.middleware';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware';
import { Request, Response } from 'express';

const router = Router();
const serviceV2 = new ReminderServiceV2();

/**
 * POST /v1/reminders
 * Create a new reminder (with idempotency)
 */
router.post(
  '/',
  idempotencyMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const dto = {
      userId: req.body.userId,
      title: req.body.title,
      dueAt: new Date(req.body.dueAt),
      source: req.body.source,
      advanceMinutes: req.body.advanceMinutes,
      metadata: req.body.metadata
    };

    const reminder = await serviceV2.create(dto);

    res
      .status(201)
      .location(`/v1/reminders/${reminder.id}`)
      .json(reminder);
  })
);

/**
 * GET /v1/reminders
 * List reminders with pagination
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const filter = {
      userId: req.query.userId as string,
      status: req.query.status as any,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20
    };

    const result = await serviceV2.list(filter);
    res.json(result);
  })
);

/**
 * GET /v1/reminders/:id
 * Get a specific reminder
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).userId; // From auth middleware

    const reminder = await serviceV2.getById(id, userId);
    res.json(reminder);
  })
);

/**
 * PATCH /v1/reminders/:id
 * Update a reminder
 */
router.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).userId;

    const dto: any = {};
    if (req.body.title !== undefined) dto.title = req.body.title;
    if (req.body.dueAt !== undefined) dto.dueAt = new Date(req.body.dueAt);
    if (req.body.status !== undefined) dto.status = req.body.status;
    if (req.body.advanceMinutes !== undefined) dto.advanceMinutes = req.body.advanceMinutes;
    if (req.body.metadata !== undefined) dto.metadata = req.body.metadata;

    const reminder = await serviceV2.update(id, dto, userId);
    res.json(reminder);
  })
);

/**
 * DELETE /v1/reminders/:id
 * Soft delete a reminder
 */
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).userId;

    await serviceV2.delete(id, userId);
    res.status(204).send();
  })
);

export default router;
