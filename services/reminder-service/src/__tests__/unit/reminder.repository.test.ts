/**
 * Unit Tests for Reminder Repository
 * Tests data access layer with PostgreSQL
 */

import { ReminderRepository } from "../../repositories/reminder.repository";
import {
  Reminder,
  ReminderStatus,
  ReminderSource,
  ReminderFilter,
} from "../../models/reminder.model";
import { Pool } from "pg";

// Mock pg Pool
jest.mock("pg", () => ({
  Pool: jest.fn(),
}));

// Mock the database config
jest.mock("../../config/database", () => ({
  default: {
    query: jest.fn(),
  },
}));

describe("ReminderRepository - Unit Tests", () => {
  let repository: ReminderRepository;
  let mockPool: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a simple mock pool
    mockPool = {
      query: jest.fn(),
    };

    repository = new ReminderRepository(mockPool);
  });

  describe("create", () => {
    const createData = {
      userId: "user-123",
      title: "Test Reminder",
      dueAt: new Date("2025-12-01T10:00:00Z"),
      source: ReminderSource.MANUAL,
      advanceMinutes: 30,
      metadata: { priority: "high" },
    };

    it("should create reminder successfully", async () => {
      const mockRow = {
        id: "reminder-123",
        userId: "user-123",
        title: "Test Reminder",
        dueAt: new Date("2025-12-01T10:00:00Z"),
        status: "pending",
        source: "manual",
        advanceMinutes: 30,
        metadata: '{"priority":"high"}',
        notifiedAt: null,
        createdAt: new Date("2025-01-01T09:00:00Z"),
        updatedAt: new Date("2025-01-01T09:00:00Z"),
      };

      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.create(createData);

      expect(result).toEqual({
        id: "reminder-123",
        userId: "user-123",
        title: "Test Reminder",
        dueAt: new Date("2025-12-01T10:00:00Z"),
        status: ReminderStatus.PENDING,
        source: ReminderSource.MANUAL,
        advanceMinutes: 30,
        metadata: { priority: "high" },
        createdAt: new Date("2025-01-01T09:00:00Z"),
        updatedAt: new Date("2025-01-01T09:00:00Z"),
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO reminders"),
        expect.any(Array),
      );
    });

    it("should create reminder with default values", async () => {
      const minimalData = {
        userId: "user-123",
        title: "Minimal Reminder",
        dueAt: new Date("2025-12-01T10:00:00Z"),
      };

      const mockRow = {
        id: "reminder-456",
        userId: "user-123",
        title: "Minimal Reminder",
        dueAt: new Date("2025-12-01T10:00:00Z"),
        status: "pending",
        source: "manual",
        advanceMinutes: 0,
        metadata: null,
        notifiedAt: null,
        createdAt: new Date("2025-01-01T09:00:00Z"),
        updatedAt: new Date("2025-01-01T09:00:00Z"),
      };

      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.create(minimalData);

      expect(result.advanceMinutes).toBe(0);
      expect(result.source).toBe(ReminderSource.MANUAL);
      expect(result.metadata).toBeUndefined();
    });
  });

  describe("findById", () => {
    it("should return reminder when found", async () => {
      const mockRow = {
        id: "reminder-123",
        userId: "user-123",
        title: "Test Reminder",
        dueAt: new Date("2025-12-01T10:00:00Z"),
        status: "pending",
        source: "manual",
        advanceMinutes: 30,
        metadata: '{"priority":"high"}',
        notifiedAt: null,
        createdAt: new Date("2025-01-01T09:00:00Z"),
        updatedAt: new Date("2025-01-01T09:00:00Z"),
      };

      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.findById("reminder-123");

      expect(result).toBeDefined();
      expect(result!.id).toBe("reminder-123");
      expect(result!.userId).toBe("user-123");
    });

    it("should return null when reminder not found", async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.findById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("find", () => {
    it("should return paginated reminders with filters", async () => {
      const filter: ReminderFilter = {
        userId: "user-123",
        status: ReminderStatus.PENDING,
        page: 1,
        limit: 10,
      };

      const mockRows = [
        {
          id: "reminder-1",
          userId: "user-123",
          title: "Reminder 1",
          dueAt: new Date("2025-12-01T10:00:00Z"),
          status: "pending",
          source: "manual",
          advanceMinutes: 30,
          metadata: null,
          notifiedAt: null,
          createdAt: new Date("2025-01-01T09:00:00Z"),
          updatedAt: new Date("2025-01-01T09:00:00Z"),
        },
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: "1" }] }) // count query
        .mockResolvedValueOnce({ rows: mockRows }); // data query

      const result = await repository.find(filter);

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.totalPages).toBe(1);
    });

    it("should apply userId filter", async () => {
      const filter: ReminderFilter = { userId: "user-123" };

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: "0" }] }) // count query
        .mockResolvedValueOnce({ rows: [] }); // data query

      await repository.find(filter);

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain("WHERE user_id = $1");
      expect(queryCall[1]).toEqual(["user-123"]);
    });

    it("should apply status filter", async () => {
      const filter: ReminderFilter = { status: ReminderStatus.COMPLETED };

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: "0" }] }) // count query
        .mockResolvedValueOnce({ rows: [] }); // data query

      await repository.find(filter);

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain("WHERE status = $1");
      expect(queryCall[1]).toEqual(["completed"]);
    });

    it("should apply pagination", async () => {
      const filter: ReminderFilter = { page: 2, limit: 20 };

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: "0" }] }) // count query
        .mockResolvedValueOnce({ rows: [] }); // data query

      await repository.find(filter);

      const queryCall = mockPool.query.mock.calls[1]; // Check the data query (second call)
      expect(queryCall[0]).toContain("LIMIT $1 OFFSET $2");
      expect(queryCall[1]).toEqual([20, 20]); // limit=20, offset=(page-1)*limit=20
    });
  });

  describe("update", () => {
    it("should update reminder fields", async () => {
      const updateData = {
        title: "Updated Title",
        status: ReminderStatus.COMPLETED,
        metadata: { completed: true },
      };

      const mockRow = {
        id: "reminder-123",
        userId: "user-123",
        title: "Updated Title",
        dueAt: new Date("2025-12-01T10:00:00Z"),
        status: "completed",
        source: "manual",
        advanceMinutes: 30,
        metadata: '{"completed":true}',
        notifiedAt: null,
        createdAt: new Date("2025-01-01T09:00:00Z"),
        updatedAt: new Date("2025-01-01T10:00:00Z"),
      };

      mockPool.query.mockResolvedValue({ rows: [mockRow] });

      const result = await repository.update("reminder-123", updateData);

      expect(result).toBeDefined();
      expect(result!.title).toBe("Updated Title");
      expect(result!.status).toBe(ReminderStatus.COMPLETED);
      expect(result!.metadata).toEqual({ completed: true });
    });

    it("should return null when reminder not found", async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.update("non-existent", {
        title: "Updated",
      });

      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("should soft delete reminder", async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ id: "reminder-123" }],
        rowCount: 1,
      });

      const result = await repository.delete("reminder-123");

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "UPDATE reminders\n      SET status = $1\n      WHERE id = $2\n      RETURNING id",
        ),
        ["cancelled", "reminder-123"],
      );
    });

    it("should return false when reminder not found", async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.delete("non-existent");

      expect(result).toBe(false);
    });
  });

  describe("findDueReminders", () => {
    it("should return reminders due for notification", async () => {
      const mockRows = [
        {
          id: "reminder-1",
          userId: "user-1",
          title: "Due Reminder 1",
          dueAt: new Date("2025-12-01T10:00:00Z"),
          status: "scheduled",
          source: "manual",
          advanceMinutes: 30,
          metadata: null,
          notifiedAt: null,
          createdAt: new Date("2025-01-01T09:00:00Z"),
          updatedAt: new Date("2025-01-01T09:00:00Z"),
        },
      ];

      mockPool.query.mockResolvedValue({ rows: mockRows });

      const result = await repository.findDueReminders();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("reminder-1");
      expect(result[0].status).toBe(ReminderStatus.SCHEDULED);
    });

    it("should return empty array when no due reminders", async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.findDueReminders();

      expect(result).toEqual([]);
    });
  });

  describe("markAsNotified", () => {
    it("should mark reminder as notified", async () => {
      mockPool.query.mockResolvedValue({} as any);

      await repository.markAsNotified("reminder-123");

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "UPDATE reminders\n      SET status = $1, notified_at = NOW()\n      WHERE id = $2",
        ),
        [ReminderStatus.NOTIFIED, "reminder-123"],
      );
    });
  });

  describe("error handling", () => {
    it("should handle query errors", async () => {
      mockPool.query.mockRejectedValue(new Error("Query failed"));

      await expect(repository.findById("test")).rejects.toThrow("Query failed");
    });
  });
});
