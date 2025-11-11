import { ZBClient } from 'zeebe-node';
import { eventLogger } from '../utils/logger';
import { EventType } from '../utils/logger';

export interface ReminderProcessData {
  reminderId: string;
  userId: string;
  title: string;
  dueAt: string;
  advanceMinutes: number;
  metadata?: Record<string, any>;
}

export class CamundaService {
  private client: ZBClient | null = null;

  constructor() {
    if (process.env.ZEEBE_GATEWAY_ADDRESS) {
      try {
        this.client = new ZBClient(process.env.ZEEBE_GATEWAY_ADDRESS!, {
          loglevel: 'INFO',
        });
        eventLogger.log(EventType.CAMUNDA_CONNECTED, {
          gateway: process.env.ZEEBE_GATEWAY_ADDRESS
        });
      } catch (error) {
        eventLogger.log(EventType.CAMUNDA_ERROR, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        this.client = null;
      }
    }
  }

  async startReminderProcess(data: ReminderProcessData): Promise<void> {
    if (!this.client) {
      throw new Error('Camunda client not initialized');
    }

    try {
      const result = await this.client.createProcessInstance({
        bpmnProcessId: 'reminder-process',
        variables: {
          reminderId: data.reminderId,
          userId: data.userId,
          title: data.title,
          dueAt: data.dueAt,
          advanceMinutes: data.advanceMinutes,
          metadata: data.metadata || {},
          status: 'scheduled'
        }
      });

      eventLogger.log(EventType.CAMUNDA_PROCESS_STARTED, {
        reminderId: data.reminderId,
        processInstanceKey: result.processInstanceKey
      });

    } catch (error) {
      eventLogger.log(EventType.CAMUNDA_ERROR, {
        reminderId: data.reminderId,
        error: error instanceof Error ? error.message : 'Failed to start process'
      });
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }
}

// Singleton instance
export const camundaService = new CamundaService();