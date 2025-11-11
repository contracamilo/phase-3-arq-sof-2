/**
 * RabbitMQ Publisher
 * Publishes reminder events to the message broker
 */

import amqp, { Connection, Channel } from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const EXCHANGE_NAME = 'reminders.exchange';
const EXCHANGE_TYPE = 'topic';

// Dead Letter Exchange for failed messages
const DLX_EXCHANGE = 'reminders.dlx';
const DLX_QUEUE = 'reminders.dlq';

let connection: Connection | null = null;
let channel: Channel | null = null;

/**
 * Initialize RabbitMQ connection and channel
 */
export async function initRabbitMQ(): Promise<void> {
  try {
    // Connect to RabbitMQ
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Declare main exchange
    await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, {
      durable: true
    });

    // Declare Dead Letter Exchange
    await channel.assertExchange(DLX_EXCHANGE, 'fanout', {
      durable: true
    });

    // Declare Dead Letter Queue
    await channel.assertQueue(DLX_QUEUE, {
      durable: true
    });

    await channel.bindQueue(DLX_QUEUE, DLX_EXCHANGE, '');

    // Declare main queues with DLX configuration
    await declareQueue('reminder_due', 'reminder.due', 3);
    await declareQueue('reminder_created', 'reminder.created', 3);
    await declareQueue('reminder_updated', 'reminder.updated', 3);

    console.log('✅ RabbitMQ connected and configured');

    // Handle connection errors
    connection.on('error', (err) => {
      console.error('RabbitMQ connection error:', err);
    });

    connection.on('close', () => {
      console.log('RabbitMQ connection closed, reconnecting...');
      setTimeout(initRabbitMQ, 5000);
    });

  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    setTimeout(initRabbitMQ, 5000);
  }
}

/**
 * Declare a queue with retry strategy using DLX
 */
async function declareQueue(queueName: string, routingKey: string, maxRetries: number): Promise<void> {
  if (!channel) throw new Error('Channel not initialized');

  // Main queue with DLX configuration
  await channel.assertQueue(queueName, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': DLX_EXCHANGE,
      'x-message-ttl': 300000, // 5 minutes
    }
  });

  await channel.bindQueue(queueName, EXCHANGE_NAME, routingKey);

  // Retry queue with delayed requeue
  const retryQueue = `${queueName}.retry`;
  await channel.assertQueue(retryQueue, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': EXCHANGE_NAME,
      'x-dead-letter-routing-key': routingKey,
      'x-message-ttl': 60000, // 1 minute delay
    }
  });
}

/**
 * Publish an event to RabbitMQ
 */
export async function publishEvent(
  routingKey: string,
  data: any,
  options?: {
    persistent?: boolean;
    priority?: number;
    expiration?: string;
  }
): Promise<boolean> {
  if (!channel) {
    console.error('RabbitMQ channel not initialized');
    return false;
  }

  try {
    const message = JSON.stringify({
      ...data,
      timestamp: new Date().toISOString(),
      messageId: generateMessageId()
    });

    const published = channel.publish(
      EXCHANGE_NAME,
      routingKey,
      Buffer.from(message),
      {
        persistent: options?.persistent ?? true,
        priority: options?.priority ?? 0,
        expiration: options?.expiration,
        contentType: 'application/json',
        contentEncoding: 'utf-8',
        timestamp: Date.now()
      }
    );

    if (!published) {
      console.warn('Message not published, channel buffer full');
    }

    return published;
  } catch (error) {
    console.error('Error publishing message:', error);
    return false;
  }
}

/**
 * Publish reminder due event
 */
export async function publishReminderEvent(event: {
  type: 'reminder_due' | 'reminder_created' | 'reminder_updated';
  data: any;
  timestamp: Date;
}): Promise<boolean> {
  const routingKeyMap = {
    reminder_due: 'reminder.due',
    reminder_created: 'reminder.created',
    reminder_updated: 'reminder.updated'
  };

  return publishEvent(routingKeyMap[event.type], event);
}

/**
 * Close RabbitMQ connection
 */
export async function closeRabbitMQ(): Promise<void> {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log('RabbitMQ connection closed');
  } catch (error) {
    console.error('Error closing RabbitMQ:', error);
  }
}

/**
 * Generate unique message ID
 */
function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}
