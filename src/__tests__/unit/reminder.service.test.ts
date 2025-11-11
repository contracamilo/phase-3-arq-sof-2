/**
 * Unit Tests for Reminder Service
 * Tests business logic, validation, and error handling
 */

import { ReminderServiceV2 } from '../services/reminder.service.v2';
import { ReminderRepository } from '../repositories/reminder.repository';
import {
  Reminder,
  ReminderStatus,
  ReminderSource,
  ReminderValidator
} from '../models/reminder.model';
import { ValidationError, NotFoundError, ConflictError } from '../middleware/error.middleware';

// Mock repository
jest.mock('../repositories/reminder.repository');

describe('ReminderService - Unit Tests', () => {
  let service: ReminderServiceV2;
  let mockRepository: jest.Mocked<ReminderRepository>;

  beforeEach(() => {
    mockRepository = new ReminderRepository() as jest.Mocked<ReminderRepository>;
    service = new ReminderServiceV2(mockRepository);
  });

  describe('create', () => {
    it('should create a valid reminder', async () => {
      const dto = {
        userId: 'user-123',
        title: 'Test reminder',
        dueAt: new Date('2025-12-01T10:00:00Z'),
        advanceMinutes: 30
      };

      const mockReminder: Reminder = {
        id: '123',
        ...dto,
        status: ReminderStatus.PENDING,
        source: ReminderSource.MANUAL,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.create.mockResolvedValue(mockReminder);

      const result = await service.create(dto);

      expect(result).toEqual(mockReminder);
      expect(mockRepository.create).toHaveBeenCalledWith(dto);
    });

    it('should reject reminder with past due date', async () => {
      const dto = {
        userId: 'user-123',
        title: 'Test reminder',
        dueAt: new Date('2020-01-01T10:00:00Z'),
        advanceMinutes: 30
      };

      await expect(service.create(dto)).rejects.toThrow(ValidationError);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject reminder with invalid advance minutes', async () => {
      const dto = {
        userId: 'user-123',
        title: 'Test reminder',
        dueAt: new Date('2025-12-01T10:00:00Z'),
        advanceMinutes: 20000 // Exceeds max
      };

      await expect(service.create(dto)).rejects.toThrow(ValidationError);
    });

    it('should reject reminder with empty title', async () => {
      const dto = {
        userId: 'user-123',
        title: '',
        dueAt: new Date('2025-12-01T10:00:00Z'),
        advanceMinutes: 30
      };

      await expect(service.create(dto)).rejects.toThrow(ValidationError);
    });
  });

  describe('update', () => {
    it('should update reminder status', async () => {
      const existingReminder: Reminder = {
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

      const updatedReminder = {
        ...existingReminder,
        status: ReminderStatus.COMPLETED
      };

      mockRepository.findById.mockResolvedValue(existingReminder);
      mockRepository.update.mockResolvedValue(updatedReminder);

      const result = await service.update('123', { status: ReminderStatus.COMPLETED });

      expect(result.status).toBe(ReminderStatus.COMPLETED);
    });

    it('should reject invalid status transition', async () => {
      const existingReminder: Reminder = {
        id: '123',
        userId: 'user-123',
        title: 'Test',
        dueAt: new Date('2025-12-01T10:00:00Z'),
        status: ReminderStatus.COMPLETED, // Already completed
        source: ReminderSource.MANUAL,
        advanceMinutes: 30,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.findById.mockResolvedValue(existingReminder);

      await expect(
        service.update('123', { status: ReminderStatus.PENDING })
      ).rejects.toThrow(ConflictError);
    });

    it('should throw NotFoundError for non-existent reminder', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { title: 'Updated' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should soft delete reminder', async () => {
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
