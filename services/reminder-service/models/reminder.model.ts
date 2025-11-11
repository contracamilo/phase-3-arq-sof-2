/**
 * Domain Model for Reminder entity
 * Aligned with OpenAPI 3.1 specification and PostgreSQL schema
 */

export enum ReminderStatus {
  PENDING = "pending",
  SCHEDULED = "scheduled",
  NOTIFIED = "notified",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum ReminderSource {
  MANUAL = "manual",
  LMS = "LMS",
  CALENDAR = "calendar",
  EXTERNAL = "external",
}

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  dueAt: Date;
  status: ReminderStatus;
  source: ReminderSource;
  advanceMinutes: number;
  metadata?: Record<string, any>;
  notifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReminderDTO {
  userId: string;
  title: string;
  dueAt: Date;
  source?: ReminderSource;
  advanceMinutes?: number;
  metadata?: Record<string, any>;
}

export interface UpdateReminderDTO {
  title?: string;
  dueAt?: Date;
  status?: ReminderStatus;
  advanceMinutes?: number;
  metadata?: Record<string, any>;
}

export interface ReminderFilter {
  userId?: string;
  status?: ReminderStatus;
  page?: number;
  limit?: number;
}

export interface PaginatedReminders {
  data: Reminder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Idempotency key record for POST operations
 */
export interface IdempotencyRecord {
  idempotencyKey: string;
  resourceId: string;
  resourceType: string;
  requestHash: string;
  responseStatus: number;
  responseBody: any;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Business rules and validation
 */
export class ReminderValidator {
  static readonly MAX_ADVANCE_MINUTES = 10080; // 7 days
  static readonly MIN_ADVANCE_MINUTES = 0;
  static readonly MAX_TITLE_LENGTH = 255;

  static validateAdvanceMinutes(minutes: number): boolean {
    return (
      minutes >= this.MIN_ADVANCE_MINUTES && minutes <= this.MAX_ADVANCE_MINUTES
    );
  }

  static validateDueDate(dueAt: Date): boolean {
    return dueAt > new Date();
  }

  static validateTitle(title: string): boolean {
    return title.length > 0 && title.length <= this.MAX_TITLE_LENGTH;
  }

  static canTransitionTo(
    currentStatus: ReminderStatus,
    newStatus: ReminderStatus,
  ): boolean {
    const allowedTransitions = {
      [ReminderStatus.PENDING]: [
        ReminderStatus.SCHEDULED,
        ReminderStatus.CANCELLED,
      ],
      [ReminderStatus.SCHEDULED]: [
        ReminderStatus.NOTIFIED,
        ReminderStatus.CANCELLED,
      ],
      [ReminderStatus.NOTIFIED]: [
        ReminderStatus.COMPLETED,
        ReminderStatus.CANCELLED,
      ],
      [ReminderStatus.COMPLETED]: [] as ReminderStatus[],
      [ReminderStatus.CANCELLED]: [] as ReminderStatus[],
    };

    return allowedTransitions[currentStatus]?.includes(newStatus) || false;
  }
}
