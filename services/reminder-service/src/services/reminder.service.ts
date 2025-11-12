import { v4 as uuidv4 } from "uuid";
import pool from "../config/database";
import {
  Reminder,
  CreateReminderDTO,
  UpdateReminderDTO,
  ReminderStatus,
  ReminderSource,
} from "../models/reminder.model";
import { eventLogger, EventType } from "../utils/logger";
import {
  remindersCreatedCounter,
  remindersNotifiedCounter,
  idempotencyConflictsCounter,
  reminderProcessingDuration
} from "../instrumentation/opentelemetry";

export class ReminderService {
  async createReminder(
    data: CreateReminderDTO,
    idempotencyKey?: string,
  ): Promise<Reminder> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Check idempotency key if provided
      if (idempotencyKey) {
            const existingKey = await client.query(
              "SELECT resource_id as reminder_id FROM reminder.idempotency_keys WHERE idempotency_key = $1",
              [idempotencyKey],
            );

        if (existingKey.rows.length > 0) {
          // Return existing reminder
              const existingReminder = await client.query(
                "SELECT * FROM reminder.reminders WHERE id = $1",
                [existingKey.rows[0].reminder_id],
              );

          await client.query("COMMIT");

          // Business metric: idempotency conflict
          idempotencyConflictsCounter.add(1, {
            source: 'api',
            user_id: data.userId
          });

          eventLogger.log(EventType.IDEMPOTENT_REQUEST, {
            idempotencyKey,
            reminderId: existingKey.rows[0].reminder_id,
          });

          return this.mapRowToReminder(existingReminder.rows[0]);
        }
      }

      const id = uuidv4();
      const status = ReminderStatus.PENDING;
      const source = data.source || ReminderSource.MANUAL;
      const advanceMinutes = data.advanceMinutes || 0;

      const result = await client.query(
        `INSERT INTO reminders (id, user_id, title, due_at, status, source, advance_minutes, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         RETURNING *`,
        [
          id,
          data.userId,
          data.title,
          data.dueAt,
          status,
          source,
          advanceMinutes,
          JSON.stringify(data.metadata || {}),
        ],
      );

      // Store idempotency key if provided
      if (idempotencyKey) {
            await client.query(
              "INSERT INTO reminder.idempotency_keys (idempotency_key, resource_id) VALUES ($1, $2)",
              [idempotencyKey, id],
            );
      }

      await client.query("COMMIT");

      const reminder = this.mapRowToReminder(result.rows[0]);

      eventLogger.log(EventType.REMINDER_CREATED, {
        id: reminder.id,
        title: reminder.title,
        idempotencyKey,
      });

      // Business metric: reminder created successfully
      remindersCreatedCounter.add(1, {
        source: source,
        status: status,
        user_id: data.userId
      });

      return reminder;
    } catch (error) {
      await client.query("ROLLBACK");
      eventLogger.log(EventType.ERROR_OCCURRED, {
        operation: "createReminder",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async getAllReminders(): Promise<Reminder[]> {
    try {
          const result = await pool.query(
            "SELECT * FROM reminder.reminders ORDER BY due_at ASC",
          );

      const reminders = result.rows.map((row: any) =>
        this.mapRowToReminder(row),
      );

      eventLogger.log(EventType.REMINDER_LIST_RETRIEVED, {
        count: reminders.length,
      });

      return reminders;
    } catch (error) {
      eventLogger.log(EventType.ERROR_OCCURRED, {
        operation: "getAllReminders",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async getReminderById(id: string): Promise<Reminder | null> {
    try {
          const result = await pool.query("SELECT * FROM reminder.reminders WHERE id = $1", [
        id,
      ]);

      if (result.rows.length === 0) {
        return null;
      }

      const reminder = this.mapRowToReminder(result.rows[0]);

      eventLogger.log(EventType.REMINDER_RETRIEVED, {
        id: reminder.id,
      });

      return reminder;
    } catch (error) {
      eventLogger.log(EventType.ERROR_OCCURRED, {
        operation: "getReminderById",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async updateReminder(
    id: string,
    data: UpdateReminderDTO,
  ): Promise<Reminder | null> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Build dynamic update query
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

      updates.push(`updated_at = NOW()`);

      values.push(id);

          const query = `UPDATE reminder.reminders SET ${updates.join(", ")} WHERE id = $${paramCount} RETURNING *`;
      const result = await client.query(query, values);

      await client.query("COMMIT");

      if (result.rows.length === 0) {
        return null;
      }

      eventLogger.log(EventType.REMINDER_UPDATED, {
        id,
        updates: data,
      });

      return this.mapRowToReminder(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      eventLogger.log(EventType.ERROR_OCCURRED, {
        operation: "updateReminder",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteReminder(id: string): Promise<boolean> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
            "DELETE FROM reminder.reminders WHERE id = $1 RETURNING id",
        [id],
      );

      await client.query("COMMIT");

      if (result.rows.length === 0) {
        return false;
      }

      eventLogger.log(EventType.REMINDER_DELETED, {
        id,
      });

      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      eventLogger.log(EventType.ERROR_OCCURRED, {
        operation: "deleteReminder",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    } finally {
      client.release();
    }
  }

  private mapRowToReminder(row: any): Reminder {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      dueAt: row.due_at,
      status: row.status,
      source: row.source,
      advanceMinutes: row.advance_minutes,
      metadata: row.metadata,
      notifiedAt: row.notified_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const reminderService = new ReminderService();
