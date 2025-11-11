/**
 * Unit Tests for Reminder Service V2
 * Tests business logic, validation, orchestration, and error handling
 */

import { ReminderServiceV2 } from '../../services/reminder.service.v2';
import { ReminderRepository } from '../../repositories/reminder.repository';
import { camundaService, CamundaService } from '../../services/camunda.service';
import { eventLogger } from '../../utils/logger';
import {
  Reminder,
  CreateReminderDTO,
  UpdateReminderDTO,
  ReminderStatus,
  ReminderSource,
  ReminderValidator
} from '../../models/reminder.model';
import { ValidationError, NotFoundError, ConflictError } from '../../middleware/error.middleware';

// Mock dependencies
jest.mock('../../repositories/reminder.repository');
jest.mock('../../services/camunda.service');
jest.mock('../../utils/logger');

describe('ReminderServiceV2 - Unit Tests', () => {
  let service: ReminderServiceV2;
  let mockRepository: jest.Mocked<ReminderRepository>;
  let mockCamundaService: jest.Mocked<CamundaService>;
  let mockEventLogger: jest.Mocked<typeof eventLogger>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create service instance
    service = new ReminderServiceV2();

    // Get mocked instances
    mockRepository = ReminderRepository.prototype as jest.Mocked<ReminderRepository>;
    mockCamundaService = (camundaService as any) as jest.Mocked<CamundaService>;
    mockEventLogger = eventLogger as jest.Mocked<typeof eventLogger>;
  });

  describe('create', () => {
    const validDTO: CreateReminderDTO = {
      userId: 'user-123',
      title: 'Test reminder',
      dueAt: new Date('2025-12-01T10:00:00Z'),
      advanceMinutes: 30
    };

    it('should create a valid reminder and trigger Camunda process', async () => {
      const mockReminder: Reminder = {
        id: '123',
        ...validDTO,
        status: ReminderStatus.PENDING,
        source: ReminderSource.MANUAL,
        advanceMinutes: validDTO.advanceMinutes || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.create.mockResolvedValue(mockReminder);
      mockCamundaService.startReminderProcess.mockResolvedValue();

      const result = await service.create(validDTO);

      expect(result).toEqual(mockReminder);
      expect(mockRepository.create).toHaveBeenCalledWith(validDTO);
      expect(mockEventLogger.log).toHaveBeenCalledWith('REMINDER_CREATED', {
        reminderId: mockReminder.id,
        userId: mockReminder.userId,
        dueAt: mockReminder.dueAt
      });
      expect(mockCamundaService.startReminderProcess).toHaveBeenCalledWith({
        reminderId: mockReminder.id,
        userId: mockReminder.userId,
        title: mockReminder.title,
        dueAt: mockReminder.dueAt.toISOString(),
        advanceMinutes: mockReminder.advanceMinutes,
        metadata: undefined
      });
    });

    it('should create reminder without Camunda when service unavailable', async () => {
      const mockReminder: Reminder = {
        id: '123',
        ...validDTO,
        status: ReminderStatus.PENDING,
        source: ReminderSource.MANUAL,
        advanceMinutes: validDTO.advanceMinutes || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.create.mockResolvedValue(mockReminder);
      mockCamundaService.startReminderProcess.mockRejectedValue(new Error('Camunda unavailable'));

      const result = await service.create(validDTO);

      expect(result).toEqual(mockReminder);
      expect(mockRepository.create).toHaveBeenCalledWith(validDTO);
      expect(mockCamundaService.startReminderProcess).toHaveBeenCalled();
      // Service should continue despite Camunda failure
    });

    it('should reject reminder with past due date', async () => {
      const pastDTO: CreateReminderDTO = {
        ...validDTO,
        dueAt: new Date('2020-01-01T10:00:00Z')
      };

      await expect(service.create(pastDTO)).rejects.toThrow(ValidationError);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject reminder with invalid advance minutes', async () => {
      const invalidDTO: CreateReminderDTO = {
        ...validDTO,
        advanceMinutes: 20000 // Exceeds max
      };

      await expect(service.create(invalidDTO)).rejects.toThrow(ValidationError);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject reminder with empty title', async () => {
      const invalidDTO: CreateReminderDTO = {
        ...validDTO,
        title: ''
      };

      await expect(service.create(invalidDTO)).rejects.toThrow(ValidationError);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should create reminder with metadata', async () => {
      const dtoWithMetadata: CreateReminderDTO = {
        ...validDTO,
        metadata: { priority: 'high', category: 'work' }
      };

      const mockReminder: Reminder = {
        id: '123',
        ...dtoWithMetadata,
        status: ReminderStatus.PENDING,
        source: ReminderSource.MANUAL,
        advanceMinutes: dtoWithMetadata.advanceMinutes || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.create.mockResolvedValue(mockReminder);
      mockCamundaService.startReminderProcess.mockResolvedValue();

      const result = await service.create(dtoWithMetadata);

      expect(result.metadata).toEqual(dtoWithMetadata.metadata);
      expect(mockCamundaService.startReminderProcess).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: dtoWithMetadata.metadata
        })
      );
    });
  });

  describe('getById', () => {
    it('should return reminder when found', async () => {
      const mockReminder: Reminder = {
        id: '123',
        userId: 'user-123',
        title: 'Test',
        dueAt: new Date('2025-12-01T10:00:00Z'),
        status: ReminderStatus.PENDING,
        source: ReminderSource.MANUAL,
        advanceMinutes: 30,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.findById.mockResolvedValue(mockReminder);

      const result = await service.getById('123');

      expect(result).toEqual(mockReminder);
      expect(mockRepository.findById).toHaveBeenCalledWith('123');
    });

    it('should throw NotFoundError for non-existent reminder', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getById('non-existent')).rejects.toThrow(NotFoundError);
    });

    it('should enforce ownership when userId provided', async () => {
      const mockReminder: Reminder = {
        id: '123',
        userId: 'user-123',
        title: 'Test',
        dueAt: new Date('2025-12-01T10:00:00Z'),
        status: ReminderStatus.PENDING,
        source: ReminderSource.MANUAL,
        advanceMinutes: 30,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.findById.mockResolvedValue(mockReminder);

      // Same user - should succeed
      const result = await service.getById('123', 'user-123');
      expect(result).toEqual(mockReminder);

      // Different user - should throw NotFoundError (not Forbidden for security)
      await expect(service.getById('123', 'different-user')).rejects.toThrow(NotFoundError);
    });
  });

  describe('list', () => {
    it('should list reminders with filters and pagination', async () => {
      const mockFilter = {
        userId: 'user-123',
        status: ReminderStatus.PENDING,
        page: 1,
        limit: 20
      };

      const mockResult = {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0
        }
      };

      mockRepository.find.mockResolvedValue(mockResult);

      const result = await service.list(mockFilter);

      expect(result).toEqual(mockResult);
      expect(mockRepository.find).toHaveBeenCalledWith(mockFilter);
    });

    it('should reject invalid pagination parameters', async () => {
      await expect(service.list({ page: 0 })).rejects.toThrow(ValidationError);
      await expect(service.list({ limit: 150 })).rejects.toThrow(ValidationError);
      await expect(service.list({ limit: 0 })).rejects.toThrow(ValidationError);
    });
  });

  describe('update', () => {
    const existingReminder: Reminder = {
      id: '123',
      userId: 'user-123',
      title: 'Original',
      dueAt: new Date('2025-12-01T10:00:00Z'),
      status: ReminderStatus.PENDING,
      source: ReminderSource.MANUAL,
      advanceMinutes: 30,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should update reminder and log event', async () => {
      const updateDTO: UpdateReminderDTO = {
        title: 'Updated title',
        status: ReminderStatus.SCHEDULED
      };

      const updatedReminder = {
        ...existingReminder,
        ...updateDTO,
        updatedAt: new Date()
      };

      mockRepository.findById.mockResolvedValue(existingReminder);
      mockRepository.update.mockResolvedValue(updatedReminder);

      const result = await service.update('123', updateDTO);

      expect(result).toEqual(updatedReminder);
      expect(mockRepository.update).toHaveBeenCalledWith('123', updateDTO);
      expect(mockEventLogger.log).toHaveBeenCalledWith('REMINDER_UPDATED', {
        reminderId: '123',
        userId: 'user-123',
        changes: ['title', 'status']
      });
    });

    it('should reject invalid status transition', async () => {
      const completedReminder = {
        ...existingReminder,
        status: ReminderStatus.COMPLETED
      };

      mockRepository.findById.mockResolvedValue(completedReminder);

      await expect(
        service.update('123', { status: ReminderStatus.PENDING })
      ).rejects.toThrow(ConflictError);
    });

    it('should reject invalid due date', async () => {
      mockRepository.findById.mockResolvedValue(existingReminder);

      await expect(
        service.update('123', { dueAt: new Date('2020-01-01') })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError for non-existent reminder', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.update('non-existent', { title: 'Updated' })).rejects.toThrow(NotFoundError);
    });

    it('should enforce ownership when userId provided', async () => {
      mockRepository.findById.mockResolvedValue(existingReminder);

      // Different user should get NotFoundError
      await expect(service.update('123', { title: 'Updated' }, 'different-user')).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should soft delete reminder and log event', async () => {
      const reminder: Reminder = {
        id: '123',
        userId: 'user-123',
        title: 'Test',
        dueAt: new Date('2025-12-01T10:00:00Z'),
        status: ReminderStatus.PENDING,
        source: ReminderSource.MANUAL,
        advanceMinutes: 30,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.findById.mockResolvedValue(reminder);
      mockRepository.delete.mockResolvedValue(true);

      await service.delete('123');

      expect(mockRepository.delete).toHaveBeenCalledWith('123');
      expect(mockEventLogger.log).toHaveBeenCalledWith('REMINDER_DELETED', {
        reminderId: '123',
        userId: undefined
      });
    });

    it('should throw NotFoundError for non-existent reminder', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(NotFoundError);
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('processDueReminders', () => {
    it('should process due reminders and mark as notified', async () => {
      const dueReminders: Reminder[] = [
        {
          id: '1',
          userId: 'user-1',
          title: 'Due reminder 1',
          dueAt: new Date('2025-01-01T10:00:00Z'),
          status: ReminderStatus.SCHEDULED,
          source: ReminderSource.MANUAL,
          advanceMinutes: 30,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          userId: 'user-2',
          title: 'Due reminder 2',
          dueAt: new Date('2025-01-01T11:00:00Z'),
          status: ReminderStatus.SCHEDULED,
          source: ReminderSource.MANUAL,
          advanceMinutes: 15,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockRepository.findDueReminders.mockResolvedValue(dueReminders);
      mockRepository.markAsNotified.mockResolvedValue();

      const processedCount = await service.processDueReminders();

      expect(processedCount).toBe(2);
      expect(mockRepository.findDueReminders).toHaveBeenCalled();
      expect(mockRepository.markAsNotified).toHaveBeenCalledTimes(2);
      expect(mockRepository.markAsNotified).toHaveBeenCalledWith('1');
      expect(mockRepository.markAsNotified).toHaveBeenCalledWith('2');
      expect(mockEventLogger.log).toHaveBeenCalledTimes(2);
      expect(mockEventLogger.log).toHaveBeenCalledWith('NOTIFICATION_SENT', {
        reminderId: '1',
        userId: 'user-1'
      });
      expect(mockEventLogger.log).toHaveBeenCalledWith('NOTIFICATION_SENT', {
        reminderId: '2',
        userId: 'user-2'
      });
    });

    it('should handle errors gracefully and continue processing', async () => {
      const dueReminders: Reminder[] = [
        {
          id: '1',
          userId: 'user-1',
          title: 'Due reminder 1',
          dueAt: new Date('2025-01-01T10:00:00Z'),
          status: ReminderStatus.SCHEDULED,
          source: ReminderSource.MANUAL,
          advanceMinutes: 30,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockRepository.findDueReminders.mockResolvedValue(dueReminders);
      mockRepository.markAsNotified.mockRejectedValue(new Error('Database error'));

      const processedCount = await service.processDueReminders();

      expect(processedCount).toBe(0); // Error prevented processing
      expect(mockRepository.markAsNotified).toHaveBeenCalledWith('1');
      // Should not log notification sent due to error
      expect(mockEventLogger.log).not.toHaveBeenCalledWith('NOTIFICATION_SENT', expect.any(Object));
    });

    it('should return 0 when no due reminders', async () => {
      mockRepository.findDueReminders.mockResolvedValue([]);

      const processedCount = await service.processDueReminders();

      expect(processedCount).toBe(0);
      expect(mockRepository.markAsNotified).not.toHaveBeenCalled();
    });
  });
});

describe('ReminderValidator - Business Rules', () => {
  describe('validateAdvanceMinutes', () => {
    it('should accept valid advance minutes', () => {
      expect(ReminderValidator.validateAdvanceMinutes(30)).toBe(true);
      expect(ReminderValidator.validateAdvanceMinutes(0)).toBe(true);
      expect(ReminderValidator.validateAdvanceMinutes(10080)).toBe(true);
    });

    it('should reject invalid advance minutes', () => {
      expect(ReminderValidator.validateAdvanceMinutes(-1)).toBe(false);
      expect(ReminderValidator.validateAdvanceMinutes(10081)).toBe(false);
    });
  });

  describe('canTransitionTo', () => {
    it('should allow valid transitions', () => {
      expect(
        ReminderValidator.canTransitionTo(ReminderStatus.PENDING, ReminderStatus.SCHEDULED)
      ).toBe(true);
      
      expect(
        ReminderValidator.canTransitionTo(ReminderStatus.SCHEDULED, ReminderStatus.NOTIFIED)
      ).toBe(true);
      
      expect(
        ReminderValidator.canTransitionTo(ReminderStatus.NOTIFIED, ReminderStatus.COMPLETED)
      ).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(
        ReminderValidator.canTransitionTo(ReminderStatus.COMPLETED, ReminderStatus.PENDING)
      ).toBe(false);
      
      expect(
        ReminderValidator.canTransitionTo(ReminderStatus.PENDING, ReminderStatus.NOTIFIED)
      ).toBe(false);
    });
  });
});
