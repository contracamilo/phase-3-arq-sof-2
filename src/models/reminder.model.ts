export interface Reminder {
  id: string;
  title: string;
  description?: string;
  due_date: Date;
  status: ReminderStatus;
  created_at: Date;
  updated_at: Date;
}

export type ReminderStatus = 'pending' | 'completed' | 'cancelled';

export interface CreateReminderDto {
  title: string;
  description?: string;
  due_date: string | Date;
  status?: ReminderStatus;
}

export interface UpdateReminderDto {
  title?: string;
  description?: string;
  due_date?: string | Date;
  status?: ReminderStatus;
}

export interface IdempotencyKey {
  key: string;
  reminder_id: string;
  created_at: Date;
}
