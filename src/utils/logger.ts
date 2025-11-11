/**
 * Event Logger - Simulates orchestration and messaging with log events
 * In a real SOA implementation, this would integrate with message brokers like RabbitMQ or Kafka
 */

export enum EventType {
  REMINDER_CREATED = 'REMINDER_CREATED',
  REMINDER_UPDATED = 'REMINDER_UPDATED',
  REMINDER_DELETED = 'REMINDER_DELETED',
  REMINDER_RETRIEVED = 'REMINDER_RETRIEVED',
  REMINDER_LIST_RETRIEVED = 'REMINDER_LIST_RETRIEVED',
  NOTIFICATION_SENT = 'NOTIFICATION_SENT',
  ERROR_OCCURRED = 'ERROR_OCCURRED',
  IDEMPOTENT_REQUEST = 'IDEMPOTENT_REQUEST',
  CAMUNDA_CONNECTED = 'CAMUNDA_CONNECTED',
  CAMUNDA_ERROR = 'CAMUNDA_ERROR',
  CAMUNDA_PROCESS_STARTED = 'CAMUNDA_PROCESS_STARTED'
}

export interface EventLog {
  type: EventType;
  timestamp: Date;
  data: any;
  service: string;
}

class EventLogger {
  private events: EventLog[] = [];

  log(type: EventType, data: any): void {
    const event: EventLog = {
      type,
      timestamp: new Date(),
      data,
      service: 'REMINDER_SERVICE'
    };

    this.events.push(event);
    
    // Simulated event publishing - in production this would send to message broker
    console.log('📨 [EVENT PUBLISHED]', JSON.stringify({
      event: type,
      timestamp: event.timestamp.toISOString(),
      service: event.service,
      payload: data
    }, null, 2));
  }

  getEvents(): EventLog[] {
    return this.events;
  }

  clearEvents(): void {
    this.events = [];
  }
}

export const eventLogger = new EventLogger();
