/**
 * Unit Tests for Camunda Service
 * Tests BPMN orchestration integration
 */

import { ZBClient } from 'zeebe-node';
import { CamundaService } from '../../services/camunda.service';
import { eventLogger, EventType } from '../../utils/logger';

// Mock zeebe-node
jest.mock('zeebe-node');
jest.mock('../../utils/logger');

const MockZBClient = ZBClient as jest.MockedClass<typeof ZBClient>;

describe('CamundaService - Unit Tests', () => {
  let camundaService: CamundaService;
  let mockZBClient: jest.Mocked<ZBClient>;
  let mockEventLogger: jest.Mocked<typeof eventLogger>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset environment
    delete process.env.ZEEBE_GATEWAY_ADDRESS;

    // Mock ZBClient
    mockZBClient = {
      createProcessInstance: jest.fn(),
      close: jest.fn()
    } as unknown as jest.Mocked<ZBClient>;

    MockZBClient.mockImplementation(() => mockZBClient);

    mockEventLogger = eventLogger as jest.Mocked<typeof eventLogger>;
  });

  describe('constructor', () => {
    it('should initialize client when ZEEBE_GATEWAY_ADDRESS is set', () => {
      process.env.ZEEBE_GATEWAY_ADDRESS = 'localhost:26500';

      new CamundaService();

      expect(MockZBClient).toHaveBeenCalledWith('localhost:26500', {
        loglevel: 'INFO'
      });
      expect(mockEventLogger.log).toHaveBeenCalledWith(EventType.CAMUNDA_CONNECTED, {
        gateway: 'localhost:26500'
      });
    });

    it('should not initialize client when ZEEBE_GATEWAY_ADDRESS is not set', () => {
      delete process.env.ZEEBE_GATEWAY_ADDRESS;

      new CamundaService();

      expect(MockZBClient).not.toHaveBeenCalled();
      expect(mockEventLogger.log).not.toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', () => {
      process.env.ZEEBE_GATEWAY_ADDRESS = 'localhost:26500';
      MockZBClient.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      new CamundaService();

      expect(mockEventLogger.log).toHaveBeenCalledWith(EventType.CAMUNDA_ERROR, {
        error: 'Connection failed'
      });
    });
  });

  describe('startReminderProcess', () => {
    const validProcessData = {
      reminderId: 'reminder-123',
      userId: 'user-456',
      title: 'Test Reminder',
      dueAt: '2025-12-01T10:00:00.000Z',
      advanceMinutes: 30,
      metadata: { priority: 'high' }
    };

    beforeEach(() => {
      process.env.ZEEBE_GATEWAY_ADDRESS = 'localhost:26500';
      camundaService = new CamundaService();
    });

    it('should start process instance successfully', async () => {
      const mockProcessInstance = {
        processInstanceKey: 'process-789',
        processDefinitionKey: 'process-def-123',
        bpmnProcessId: 'reminder-process',
        version: 1,
        tenantId: '<default>'
      };

      mockZBClient.createProcessInstance.mockResolvedValue(mockProcessInstance as any);

      await camundaService.startReminderProcess(validProcessData);

      expect(mockZBClient.createProcessInstance).toHaveBeenCalledWith({
        bpmnProcessId: 'reminder-process',
        variables: {
          reminderId: validProcessData.reminderId,
          userId: validProcessData.userId,
          title: validProcessData.title,
          dueAt: validProcessData.dueAt,
          advanceMinutes: validProcessData.advanceMinutes,
          metadata: validProcessData.metadata,
          status: 'scheduled'
        }
      });

      expect(mockEventLogger.log).toHaveBeenCalledWith(EventType.CAMUNDA_PROCESS_STARTED, {
        reminderId: validProcessData.reminderId,
        processInstanceKey: mockProcessInstance.processInstanceKey
      });
    });

    it('should handle process start errors', async () => {
      const error = new Error('Process start failed');
      mockZBClient.createProcessInstance.mockRejectedValue(error);

      await expect(camundaService.startReminderProcess(validProcessData)).rejects.toThrow(error);

      expect(mockEventLogger.log).toHaveBeenCalledWith(EventType.CAMUNDA_ERROR, {
        reminderId: validProcessData.reminderId,
        error: 'Process start failed'
      });
    });

    it('should start process without metadata', async () => {
      const processDataWithoutMetadata = {
        reminderId: 'reminder-123',
        userId: 'user-456',
        title: 'Test Reminder',
        dueAt: '2025-12-01T10:00:00.000Z',
        advanceMinutes: 30
      };

      const mockProcessInstance = {
        processInstanceKey: 'process-789',
        processDefinitionKey: 'process-def-123',
        bpmnProcessId: 'reminder-process',
        version: 1,
        tenantId: '<default>'
      };

      mockZBClient.createProcessInstance.mockResolvedValue(mockProcessInstance as any);

      await camundaService.startReminderProcess(processDataWithoutMetadata);

      expect(mockZBClient.createProcessInstance).toHaveBeenCalledWith({
        bpmnProcessId: 'reminder-process',
        variables: {
          reminderId: processDataWithoutMetadata.reminderId,
          userId: processDataWithoutMetadata.userId,
          title: processDataWithoutMetadata.title,
          dueAt: processDataWithoutMetadata.dueAt,
          advanceMinutes: processDataWithoutMetadata.advanceMinutes,
          metadata: {},
          status: 'scheduled'
        }
      });
    });

    it('should throw error when client not initialized', async () => {
      delete process.env.ZEEBE_GATEWAY_ADDRESS;
      const serviceWithoutClient = new CamundaService();

      await expect(serviceWithoutClient.startReminderProcess(validProcessData))
        .rejects.toThrow('Camunda client not initialized');
    });
  });

  describe('close', () => {
    it('should close client when initialized', async () => {
      process.env.ZEEBE_GATEWAY_ADDRESS = 'localhost:26500';
      camundaService = new CamundaService();

      await camundaService.close();

      expect(mockZBClient.close).toHaveBeenCalled();
    });

    it('should handle close when client not initialized', async () => {
      delete process.env.ZEEBE_GATEWAY_ADDRESS;
      const serviceWithoutClient = new CamundaService();

      await expect(serviceWithoutClient.close()).resolves.not.toThrow();
    });
  });
});