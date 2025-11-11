/**
 * Repository layer for Reminder persistence
 * Handles all database operations with PostgreSQL
 */

import { Pool, QueryResult } from 'pg';
import pool from '../config/database';
import {
  Reminder,
  CreateReminderDTO,
  UpdateReminderDTO,
  ReminderFilter,
  PaginatedReminders,
  ReminderStatus,
  ReminderSource,
  IdempotencyRecord
} from '../models/reminder.model';

export class ReminderRepository {
  private db: Pool;

  constructor(database: Pool = pool) {
    this.db = database;
  }

  /**
   * Create a new reminder
   */
  async create(data: CreateReminderDTO): Promise<Reminder> {
    const query = `
      INSERT INTO reminders (
        user_id, title, due_at, source, advance_minutes, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id, user_id as "userId", title, due_at as "dueAt",
        status, source, advance_minutes as "advanceMinutes",
        metadata, notified_at as "notifiedAt",
        created_at as "createdAt", updated_at as "updatedAt"
    `;

    const values = [
      data.userId,
      data.title,
      data.dueAt,
      data.source || ReminderSource.MANUAL,
      data.advanceMinutes || 15,
      JSON.stringify(data.metadata || {})
    ];

    const result: QueryResult = await this.db.query(query, values);
    return this.mapToReminder(result.rows[0]);
  }

  /**
   * Find a reminder by ID
   */
  async findById(id: string): Promise<Reminder | null> {
    const query = `
      SELECT 
        id, user_id as "userId", title, due_at as "dueAt",
        status, source, advance_minutes as "advanceMinutes",
        metadata, notified_at as "notifiedAt",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM reminders
      WHERE id = $1
    `;

    const result: QueryResult = await this.db.query(query, [id]);
    return result.rows.length > 0 ? this.mapToReminder(result.rows[0]) : null;
  }

  /**
   * Find reminders with filters and pagination
   */
  async find(filter: ReminderFilter): Promise<PaginatedReminders> {
    const { userId, status, page = 1, limit = 20 } = filter;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = [];
    let values: any[] = [];
    let paramCount = 1;

    if (userId) {
      whereConditions.push(`user_id = $${paramCount++}`);
      values.push(userId);
    }

    if (status) {
      whereConditions.push(`status = $${paramCount++}`);
      values.push(status);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Count total
    const countQuery = `SELECT COUNT(*) FROM reminders ${whereClause}`;
    const countResult = await this.db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Fetch data
    const dataQuery = `
      SELECT 
        id, user_id as "userId", title, due_at as "dueAt",
        status, source, advance_minutes as "advanceMinutes",
        metadata, notified_at as "notifiedAt",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM reminders
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `;

    const dataValues = [...values, limit, offset];
    const dataResult = await this.db.query(dataQuery, dataValues);

    return {
      data: dataResult.rows.map(row => this.mapToReminder(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update a reminder
   */
  async update(id: string, data: UpdateReminderDTO): Promise<Reminder | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(data.title);
    }

    if (data.dueAt !== undefined) {
      updates.push(`due_at = $${paramCount++}`);
      values.push(data.dueAt);
    }

    if (data.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(data.status);
    }

    if (data.advanceMinutes !== undefined) {
      updates.push(`advance_minutes = $${paramCount++}`);
      values.push(data.advanceMinutes);
    }

    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramCount++}`);
      values.push(JSON.stringify(data.metadata));
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const query = `
      UPDATE reminders
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING 
        id, user_id as "userId", title, due_at as "dueAt",
        status, source, advance_minutes as "advanceMinutes",
        metadata, notified_at as "notifiedAt",
        created_at as "createdAt", updated_at as "updatedAt"
    `;

    const result = await this.db.query(query, values);
    return result.rows.length > 0 ? this.mapToReminder(result.rows[0]) : null;
  }

  /**
   * Soft delete (mark as cancelled)
   */
  async delete(id: string): Promise<boolean> {
    const query = `
      UPDATE reminders
      SET status = $1
      WHERE id = $2
      RETURNING id
    `;

    const result = await this.db.query(query, [ReminderStatus.CANCELLED, id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Find reminders due for notification
   */
  async findDueReminders(): Promise<Reminder[]> {
    const query = `
      SELECT 
        id, user_id as "userId", title, due_at as "dueAt",
        status, source, advance_minutes as "advanceMinutes",
        metadata, notified_at as "notifiedAt",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM reminders
      WHERE status IN ('pending', 'scheduled')
        AND (due_at - (advance_minutes || ' minutes')::INTERVAL) <= NOW()
        AND notified_at IS NULL
      ORDER BY due_at ASC
    `;

    const result = await this.db.query(query);
    return result.rows.map(row => this.mapToReminder(row));
  }

  /**
   * Mark reminder as notified
   */
  async markAsNotified(id: string): Promise<void> {
    const query = `
      UPDATE reminders
      SET status = $1, notified_at = NOW()
      WHERE id = $2
    `;

    await this.db.query(query, [ReminderStatus.NOTIFIED, id]);
  }

  // ========== Idempotency Key Management ==========

  /**
   * Save idempotency record
   */
  async saveIdempotencyKey(record: Omit<IdempotencyRecord, 'createdAt' | 'expiresAt'>): Promise<void> {
    const query = `
      INSERT INTO idempotency_keys (
        idempotency_key, resource_id, resource_type,
        request_hash, response_status, response_body
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (idempotency_key) DO NOTHING
    `;

    const values = [
      record.idempotencyKey,
      record.resourceId,
      record.resourceType,
      record.requestHash,
      record.responseStatus,
      JSON.stringify(record.responseBody)
    ];

    await this.db.query(query, values);
  }

  /**
   * Find idempotency record by key
   */
  async findIdempotencyKey(key: string): Promise<IdempotencyRecord | null> {
    const query = `
      SELECT 
        idempotency_key as "idempotencyKey",
        resource_id as "resourceId",
        resource_type as "resourceType",
        request_hash as "requestHash",
        response_status as "responseStatus",
        response_body as "responseBody",
        created_at as "createdAt",
        expires_at as "expiresAt"
      FROM idempotency_keys
      WHERE idempotency_key = $1 AND expires_at > NOW()
    `;

    const result = await this.db.query(query, [key]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Clean up expired idempotency keys
   */
  async cleanupExpiredIdempotencyKeys(): Promise<number> {
    const query = `DELETE FROM idempotency_keys WHERE expires_at < NOW()`;
    const result = await this.db.query(query);
    return result.rowCount || 0;
  }

  // ========== Helper Methods ==========

  private mapToReminder(row: any): Reminder {
    return {
      id: row.id,
      userId: row.userId,
      title: row.title,
      dueAt: new Date(row.dueAt),
      status: row.status as ReminderStatus,
      source: row.source as ReminderSource,
      advanceMinutes: row.advanceMinutes,
      metadata: row.metadata,
      notifiedAt: row.notifiedAt ? new Date(row.notifiedAt) : undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }
}

export default new ReminderRepository();
