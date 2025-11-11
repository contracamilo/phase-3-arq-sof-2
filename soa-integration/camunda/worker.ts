/**
 * Camunda 8 (Zeebe) Worker Implementation
 * Handles jobs from the BPMN process
 */

import { ZBClient } from 'zeebe-node';
import axios from 'axios';
import { publishReminderEvent } from '../../src/integration/messaging/rabbitmq.publisher';

const ZEEBE_GATEWAY = process.env.ZEEBE_GATEWAY_ADDRESS || 'localhost:26500';
const REMINDERS_SERVICE_URL = process.env.REMINDERS_SERVICE_URL || 'http://localhost:3000';

const zbc = new ZBClient(ZEEBE_GATEWAY);

/**
 * Worker: Schedule Reminder
 * Validates and prepares reminder for scheduling
 */
zbc.createWorker({
  taskType: 'schedule-reminder',
  taskHandler: async (job) => {
    console.log('📅 Scheduling reminder:', job.variables.reminderId);

    try {
      const { reminderId, dueAt, advanceMinutes } = job.variables;

      // Calculate notification time
      const dueDate = new Date(dueAt);
      const notificationTime = new Date(dueDate.getTime() - advanceMinutes * 60 * 1000);

      // Validate
      if (notificationTime < new Date()) {
        throw new Error('Notification time is in the past');
      }

      // Update reminder status to 'scheduled' via API
      await axios.patch(`${REMINDERS_SERVICE_URL}/v1/reminders/${reminderId}`, {
        status: 'scheduled'
      });

      return job.complete({
        ...job.variables,
        scheduledAt: new Date().toISOString(),
        notificationTime: notificationTime.toISOString()
      });

    } catch (error) {
      console.error('Error scheduling reminder:', error);
      
      // Retry logic
      return job.fail({
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        retries: 3,
        retryBackoff: 5000 // 5 seconds
      });
    }
  }
});

/**
 * Worker: Publish Reminder Due Event
 * Publishes event to RabbitMQ when reminder is due
 */
zbc.createWorker({
  taskType: 'publish-reminder-due',
  taskHandler: async (job) => {
    console.log('📤 Publishing reminder due event:', job.variables.reminderId);

    try {
      const { reminderId, userId, title, metadata } = job.variables;

      // Publish to RabbitMQ
      const published = await publishReminderEvent({
        type: 'reminder_due',
        data: {
          reminderId,
          userId,
          title,
          dueAt: job.variables.dueAt,
          metadata: metadata || {}
        },
        timestamp: new Date()
      });

      if (!published) {
        throw new Error('Failed to publish message to RabbitMQ');
      }

      console.log('✅ Reminder due event published:', reminderId);

      return job.complete({
        ...job.variables,
        publishedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error publishing reminder due event:', error);
      
      return job.fail({
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        retries: 5,
        retryBackoff: 10000 // 10 seconds
      });
    }
  }
});

/**
 * Worker: Update Reminder Status
 * Updates reminder status after notification
 */
zbc.createWorker({
  taskType: 'update-reminder-status',
  taskHandler: async (job) => {
    console.log('🔄 Updating reminder status:', job.variables.reminderId);

    try {
      const { reminderId, status } = job.variables;

      // Update via API
      await axios.patch(`${REMINDERS_SERVICE_URL}/v1/reminders/${reminderId}`, {
        status: status || 'notified'
      });

      console.log('✅ Reminder status updated:', reminderId);

      return job.complete({
        ...job.variables,
        updatedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error updating reminder status:', error);
      
      // Don't fail the process if status update fails
      // Log and complete anyway
      console.warn('Completing job despite status update failure');
      
      return job.complete({
        ...job.variables,
        statusUpdateFailed: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * Start a new reminder process instance
 */
export async function startReminderProcess(reminder: {
  reminderId: string;
  userId: string;
  title: string;
  dueAt: string;
  advanceMinutes: number;
  metadata?: any;
}): Promise<void> {
  try {
    const processInstance = await zbc.createProcessInstance({
      bpmnProcessId: 'reminder-scheduling-process',
      variables: reminder
    });

    console.log('✅ Reminder process started:', {
      processInstanceKey: processInstance.processInstanceKey,
      reminderId: reminder.reminderId
    });

  } catch (error) {
    console.error('Failed to start reminder process:', error);
    throw error;
  }
}

/**
 * Cancel a reminder process
 */
export async function cancelReminderProcess(reminderId: string): Promise<void> {
  try {
    await zbc.publishMessage({
      name: 'cancel-reminder',
      correlationKey: reminderId,
      variables: {
        cancelled: true,
        cancelledAt: new Date().toISOString()
      }
    });

    console.log('✅ Reminder cancellation message sent:', reminderId);

  } catch (error) {
    console.error('Failed to cancel reminder process:', error);
    throw error;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down Zeebe workers...');
  await zbc.close();
  process.exit(0);
});

console.log('🚀 Camunda 8 Workers started');
console.log('Listening for jobs: schedule-reminder, publish-reminder-due, update-reminder-status');
