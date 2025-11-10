import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { Reminder, CreateReminderDto, UpdateReminderDto } from '../models/reminder.model';
import { eventLogger, EventType } from '../utils/logger';

export class ReminderService {
  
  async createReminder(data: CreateReminderDto, idempotencyKey?: string): Promise<Reminder> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check idempotency key if provided
      if (idempotencyKey) {
        const existingKey = await client.query(
          'SELECT reminder_id FROM idempotency_keys WHERE key = $1',
          [idempotencyKey]
        );
        
        if (existingKey.rows.length > 0) {
          // Return existing reminder
          const existingReminder = await client.query(
            'SELECT * FROM reminders WHERE id = $1',
            [existingKey.rows[0].reminder_id]
          );
          
          await client.query('COMMIT');
          
          eventLogger.log(EventType.IDEMPOTENT_REQUEST, {
            idempotencyKey,
            reminderId: existingKey.rows[0].reminder_id
          });
          
          return this.mapRowToReminder(existingReminder.rows[0]);
        }
      }
      
      const id = uuidv4();
      const status = data.status || 'pending';
      
      const result = await client.query(
        `INSERT INTO reminders (id, title, description, due_date, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [id, data.title, data.description, data.due_date, status]
      );
      
      // Store idempotency key if provided
      if (idempotencyKey) {
        await client.query(
          'INSERT INTO idempotency_keys (key, reminder_id) VALUES ($1, $2)',
          [idempotencyKey, id]
        );
      }
      
      await client.query('COMMIT');
      
      const reminder = this.mapRowToReminder(result.rows[0]);
      
      eventLogger.log(EventType.REMINDER_CREATED, {
        id: reminder.id,
        title: reminder.title,
        idempotencyKey
      });
      
      return reminder;
      
    } catch (error) {
      await client.query('ROLLBACK');
      eventLogger.log(EventType.ERROR_OCCURRED, {
        operation: 'createReminder',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      client.release();
    }
  }
  
  async getAllReminders(): Promise<Reminder[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM reminders ORDER BY due_date ASC'
      );
      
      const reminders = result.rows.map((row: any) => this.mapRowToReminder(row));
      
      eventLogger.log(EventType.REMINDER_LIST_RETRIEVED, {
        count: reminders.length
      });
      
      return reminders;
      
    } catch (error) {
      eventLogger.log(EventType.ERROR_OCCURRED, {
        operation: 'getAllReminders',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  async getReminderById(id: string): Promise<Reminder | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM reminders WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const reminder = this.mapRowToReminder(result.rows[0]);
      
      eventLogger.log(EventType.REMINDER_RETRIEVED, {
        id: reminder.id
      });
      
      return reminder;
      
    } catch (error) {
      eventLogger.log(EventType.ERROR_OCCURRED, {
        operation: 'getReminderById',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  async updateReminder(id: string, data: UpdateReminderDto): Promise<Reminder | null> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (data.title !== undefined) {
        updates.push(`title = $${paramCount++}`);
        values.push(data.title);
      }
      
      if (data.description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(data.description);
      }
      
      if (data.due_date !== undefined) {
        updates.push(`due_date = $${paramCount++}`);
        values.push(data.due_date);
      }
      
      if (data.status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(data.status);
      }
      
      if (updates.length === 0) {
        await client.query('ROLLBACK');
        const existing = await this.getReminderById(id);
        return existing;
      }
      
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);
      
      const query = `
        UPDATE reminders
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      
      await client.query('COMMIT');
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const reminder = this.mapRowToReminder(result.rows[0]);
      
      eventLogger.log(EventType.REMINDER_UPDATED, {
        id: reminder.id,
        updates: Object.keys(data)
      });
      
      return reminder;
      
    } catch (error) {
      await client.query('ROLLBACK');
      eventLogger.log(EventType.ERROR_OCCURRED, {
        operation: 'updateReminder',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      client.release();
    }
  }
  
  async deleteReminder(id: string): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const result = await client.query(
        'DELETE FROM reminders WHERE id = $1 RETURNING id',
        [id]
      );
      
      await client.query('COMMIT');
      
      if (result.rows.length === 0) {
        return false;
      }
      
      eventLogger.log(EventType.REMINDER_DELETED, {
        id
      });
      
      return true;
      
    } catch (error) {
      await client.query('ROLLBACK');
      eventLogger.log(EventType.ERROR_OCCURRED, {
        operation: 'deleteReminder',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      client.release();
    }
  }
  
  private mapRowToReminder(row: any): Reminder {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      due_date: row.due_date,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

export const reminderService = new ReminderService();
