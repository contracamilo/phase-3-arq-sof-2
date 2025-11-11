/**
 * Reminder Service - Business Logic Layer
 * Implements business rules, validation, and orchestration
 */

import { ReminderRepository } from '../repositories/reminder.repository';
import {
  Reminder,
  CreateReminderDTO,
  UpdateReminderDTO,
  ReminderFilter,
  PaginatedReminders,
  ReminderValidator,
  ReminderStatus
} from '../models/reminder.model';
import {
  ValidationError,
  NotFoundError,
  ConflictError
} from '../middleware/error.middleware';
import { eventLogger, EventType } from '../utils/logger';
import { camundaService } from './camunda.service';

export class ReminderServiceV2 {
  private repository: ReminderRepository;

  constructor(repository?: ReminderRepository) {
    this.repository = repository || new ReminderRepository();
  }

  /**
   * Create a new reminder with validation
   */
  async create(dto: CreateReminderDTO): Promise<Reminder> {
    // Validate business rules
    this.validateCreate(dto);

    // Create reminder
    const reminder = await this.repository.create(dto);

    // Log event
    eventLogger.log(EventType.REMINDER_CREATED, {
      reminderId: reminder.id,
      userId: reminder.userId,
      dueAt: reminder.dueAt
    });

    // TODO: Publish to Camunda for scheduling
    // This would trigger the BPMN process with timer event
    if (process.env.ZEEBE_GATEWAY_ADDRESS) {
      try {
        await camundaService.startReminderProcess({
          reminderId: reminder.id,
          userId: reminder.userId,
          title: reminder.title,
          dueAt: reminder.dueAt.toISOString(),
          advanceMinutes: reminder.advanceMinutes,
          metadata: reminder.metadata
        });
        console.log(`📅 Camunda process started for reminder ${reminder.id}`);
      } catch (error) {
        console.warn(`⚠️  Failed to start Camunda process for reminder ${reminder.id}:`, error);
        // Continue - service still works without orchestration
      }
    }

    return reminder;
  }

  /**
   * Get reminder by ID
   */
  async getById(id: string, userId?: string): Promise<Reminder> {
    const reminder = await this.repository.findById(id);

    if (!reminder) {
      throw new NotFoundError(
        `Reminder with ID '${id}' not found`,
        `/v1/reminders/${id}`
      );
    }

    // Check ownership (authorization)
    if (userId && reminder.userId !== userId) {
      throw new NotFoundError(
        `Reminder with ID '${id}' not found`,
        `/v1/reminders/${id}`
      );
    }

    return reminder;
  }

  /**
   * List reminders with filters and pagination
   */
  async list(filter: ReminderFilter): Promise<PaginatedReminders> {
    // Validate pagination params
    if (filter.page !== undefined && filter.page < 1) {
      throw new ValidationError(
        'Page number must be greater than 0',
        '/v1/reminders',
        [{ field: 'page', message: 'must be greater than 0', code: 'MIN_VALUE' }]
      );
    }

    if (filter.limit !== undefined && (filter.limit < 1 || filter.limit > 100)) {
      throw new ValidationError(
        'Limit must be between 1 and 100',
        '/v1/reminders',
        [{ field: 'limit', message: 'must be between 1 and 100', code: 'OUT_OF_RANGE' }]
      );
    }

    return this.repository.find(filter);
  }

  /**
   * Update reminder with validation
   */
  async update(id: string, dto: UpdateReminderDTO, userId?: string): Promise<Reminder> {
    // Get existing reminder
    const existing = await this.getById(id, userId);

    // Validate update
    this.validateUpdate(existing, dto);

    // Update reminder
    const updated = await this.repository.update(id, dto);

    if (!updated) {
      throw new NotFoundError(
        `Reminder with ID '${id}' not found`,
        `/v1/reminders/${id}`
      );
    }

    // Log event
    eventLogger.log(EventType.REMINDER_UPDATED, {
      reminderId: updated.id,
      userId: updated.userId,
      changes: Object.keys(dto)
    });

    return updated;
  }

  /**
   * Delete (soft delete - mark as cancelled)
   */
  async delete(id: string, userId?: string): Promise<void> {
    // Verify exists and ownership
    await this.getById(id, userId);

    // Soft delete
    const deleted = await this.repository.delete(id);

    if (!deleted) {
      throw new NotFoundError(
        `Reminder with ID '${id}' not found`,
        `/v1/reminders/${id}`
      );
    }

    // Log event
    eventLogger.log(EventType.REMINDER_DELETED, {
      reminderId: id,
      userId
    });
  }

  /**
   * Process due reminders (called by scheduler/Camunda worker)
   */
  async processDueReminders(): Promise<number> {
    const dueReminders = await this.repository.findDueReminders();
    let processedCount = 0;

    for (const reminder of dueReminders) {
      try {
        // TODO: Publish to RabbitMQ
        // await publishReminderEvent({ ... });

        // Mark as notified
        await this.repository.markAsNotified(reminder.id);

        eventLogger.log(EventType.NOTIFICATION_SENT, {
          reminderId: reminder.id,
          userId: reminder.userId
        });

        processedCount++;
      } catch (error) {
        console.error(`Failed to process reminder ${reminder.id}:`, error);
      }
    }

    return processedCount;
  }

  // ========== Private Validation Methods ==========

  private validateCreate(dto: CreateReminderDTO): void {
    const errors: any[] = [];

    // Validate title
    if (!ReminderValidator.validateTitle(dto.title)) {
      errors.push({
        field: 'title',
        message: `must be between 1 and ${ReminderValidator.MAX_TITLE_LENGTH} characters`,
        code: 'INVALID_LENGTH'
      });
    }

    // Validate due date
    if (!ReminderValidator.validateDueDate(dto.dueAt)) {
      errors.push({
        field: 'dueAt',
        message: 'must be a future date',
        code: 'INVALID_DATE'
      });
    }

    // Validate advance minutes
    if (dto.advanceMinutes !== undefined && !ReminderValidator.validateAdvanceMinutes(dto.advanceMinutes)) {
      errors.push({
        field: 'advanceMinutes',
        message: `must be between ${ReminderValidator.MIN_ADVANCE_MINUTES} and ${ReminderValidator.MAX_ADVANCE_MINUTES}`,
        code: 'OUT_OF_RANGE'
      });
    }

    if (errors.length > 0) {
      throw new ValidationError('Request validation failed', '/v1/reminders', errors);
    }
  }

  private validateUpdate(existing: Reminder, dto: UpdateReminderDTO): void {
    const errors: any[] = [];

    // Validate title if provided
    if (dto.title !== undefined && !ReminderValidator.validateTitle(dto.title)) {
      errors.push({
        field: 'title',
        message: `must be between 1 and ${ReminderValidator.MAX_TITLE_LENGTH} characters`,
        code: 'INVALID_LENGTH'
      });
    }

    // Validate due date if provided
    if (dto.dueAt !== undefined && !ReminderValidator.validateDueDate(dto.dueAt)) {
      errors.push({
        field: 'dueAt',
        message: 'must be a future date',
        code: 'INVALID_DATE'
      });
    }

    // Validate advance minutes if provided
    if (dto.advanceMinutes !== undefined && !ReminderValidator.validateAdvanceMinutes(dto.advanceMinutes)) {
      errors.push({
        field: 'advanceMinutes',
        message: `must be between ${ReminderValidator.MIN_ADVANCE_MINUTES} and ${ReminderValidator.MAX_ADVANCE_MINUTES}`,
        code: 'OUT_OF_RANGE'
      });
    }

    // Validate status transition
    if (dto.status !== undefined && !ReminderValidator.canTransitionTo(existing.status, dto.status)) {
      throw new ConflictError(
        `Cannot transition from '${existing.status}' to '${dto.status}'`,
        `/v1/reminders/${existing.id}`
      );
    }

    if (errors.length > 0) {
      throw new ValidationError('Request validation failed', `/v1/reminders/${existing.id}`, errors);
    }
  }
}

export default new ReminderServiceV2();
