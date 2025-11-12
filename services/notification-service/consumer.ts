/**
 * Notification Service - RabbitMQ Consumer
 * Consumes reminder_due events and sends push notifications via FCM/APNs
 */

import * as amqp from 'amqplib';

type Connection = any;
type Channel = any;
type ConsumeMessage = any;
import admin from 'firebase-admin';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const QUEUE_NAME = 'reminder_due';
const PREFETCH_COUNT = 10;

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FCM_PROJECT_ID,
    clientEmail: process.env.FCM_CLIENT_EMAIL,
    privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
});

interface ReminderDueEvent {
  type: 'reminder_due';
  data: {
    reminderId: string;
    userId: string;
    title: string;
    dueAt: string;
    metadata?: Record<string, any>;
  };
  timestamp: string;
  messageId: string;
}

interface UserDevice {
  userId: string;
  platform: 'ios' | 'android' | 'web';
  token: string;
}

/**
 * Main consumer function
 */
async function startConsumer(): Promise<void> {
  let connection: Connection;
  let channel: Channel;

  try {
    // Connect to RabbitMQ
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Set prefetch to control concurrent processing
    await channel.prefetch(PREFETCH_COUNT);

    // Assert queue exists
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    console.log('✅ Notification Service started');
    console.log(`📥 Listening to queue: ${QUEUE_NAME}`);

    // Consume messages
    channel.consume(QUEUE_NAME, async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      try {
        const event: ReminderDueEvent = JSON.parse(msg.content.toString());
        console.log('📬 Received reminder due event:', event.data.reminderId);

        // Process notification
        await processReminderDue(event);

        // Acknowledge message
        channel.ack(msg);
        console.log('✅ Notification sent:', event.data.reminderId);

      } catch (error) {
        console.error('❌ Error processing message:', error);

        // Get retry count from message headers
        const retryCount = (msg.properties.headers?.['x-retry-count'] || 0) + 1;
        const maxRetries = 3;

        if (retryCount < maxRetries) {
          // Requeue with retry count
          console.log(`Retrying (${retryCount}/${maxRetries})...`);
          
          channel.nack(msg, false, false); // Send to DLX
          
          // Republish with updated retry count
          channel.publish(
            '',
            'reminder_due.retry',
            msg.content,
            {
              ...msg.properties,
              headers: {
                ...msg.properties.headers,
                'x-retry-count': retryCount
              }
            }
          );
        } else {
          // Max retries reached, send to DLQ
          console.error('Max retries reached, sending to DLQ');
          channel.nack(msg, false, false);
        }
      }
    });

    // Handle connection errors
    connection.on('error', (err: any) => {
      console.error('RabbitMQ connection error:', err);
      process.exit(1);
    });

    connection.on('close', () => {
      console.log('RabbitMQ connection closed');
      process.exit(1);
    });

  } catch (error) {
    console.error('Failed to start consumer:', error);
    process.exit(1);
  }
}

/**
 * Process reminder due event and send notification
 */
async function processReminderDue(event: ReminderDueEvent): Promise<void> {
  const { reminderId, userId, title, dueAt, metadata } = event.data;

  // 1. Get user's device tokens
  const devices = await getUserDevices(userId);

  if (devices.length === 0) {
    console.warn(`No devices found for user ${userId}`);
    return;
  }

  // 2. Build notification payload
  const notification = {
    title: 'Reminder',
    body: title,
    data: {
      reminderId,
      dueAt,
      type: 'reminder_due',
      ...metadata
    }
  };

  // 3. Send to each device
  const sendPromises = devices.map(device => 
    sendNotification(device, notification)
  );

  const results = await Promise.allSettled(sendPromises);

  // 4. Log results
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`Sent notifications: ${successful} succeeded, ${failed} failed`);

  // 5. Handle invalid tokens
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const device = devices[index];
      console.error(`Failed to send to device ${device.token}:`, result.reason);
      
      // TODO: Remove invalid tokens from database
      if (isInvalidToken(result.reason)) {
        removeDeviceToken(device.userId, device.token);
      }
    }
  });
}

/**
 * Send notification to a specific device
 */
async function sendNotification(
  device: UserDevice,
  notification: {
    title: string;
    body: string;
    data: Record<string, any>;
  }
): Promise<void> {
  if (device.platform === 'android' || device.platform === 'ios') {
    // Send via FCM
    await sendFCM(device.token, notification);
  } else if (device.platform === 'web') {
    // Send web push
    await sendWebPush(device.token, notification);
  }
}

/**
 * Send notification via Firebase Cloud Messaging
 */
async function sendFCM(
  token: string,
  notification: {
    title: string;
    body: string;
    data: Record<string, any>;
  }
): Promise<void> {
  const message = {
    token,
    notification: {
      title: notification.title,
      body: notification.body
    },
    data: notification.data,
    android: {
      priority: 'high' as const,
      notification: {
        sound: 'default',
        channelId: 'reminders'
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1
        }
      }
    }
  };

  await admin.messaging().send(message);
}

/**
 * Send web push notification
 */
async function sendWebPush(
  token: string,
  _notification: {
    title: string;
    body: string;
    data: Record<string, any>;
  }
): Promise<void> {
  // Web push implementation
  // TODO: Implement using web-push library
  console.log('Web push not yet implemented:', token);
}

/**
 * Get user's registered devices
 * In production, this would query a user service/database
 */
async function getUserDevices(userId: string): Promise<UserDevice[]> {
  // TODO: Implement actual database query
  // This is a mock implementation
  
  // For demonstration, return mock data
  return [
    {
      userId,
      platform: 'android',
      token: process.env.MOCK_FCM_TOKEN || 'mock-token'
    }
  ];
}

/**
 * Check if error is due to invalid token
 */
function isInvalidToken(error: any): boolean {
  const invalidCodes = [
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered'
  ];
  
  return invalidCodes.includes(error?.code);
}

/**
 * Remove invalid device token
 */
async function removeDeviceToken(userId: string, token: string): Promise<void> {
  console.log(`Removing invalid token for user ${userId}: ${token}`);
  // TODO: Implement database deletion
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down notification service...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down notification service...');
  process.exit(0);
});

// Start the consumer
startConsumer().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
