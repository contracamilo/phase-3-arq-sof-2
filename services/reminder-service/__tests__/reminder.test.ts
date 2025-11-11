import request from "supertest";
import app from "../app";
import pool from "../config/database";
import { v4 as uuidv4 } from "uuid";

describe("Reminder Service API", () => {
  let createdReminderId: string;

  beforeAll(async () => {
    // Wait for database connection
    await pool.query("SELECT 1");
  });

  afterAll(async () => {
    // Clean up test data
    if (createdReminderId) {
      await pool.query("DELETE FROM reminders WHERE id = $1", [
        createdReminderId,
      ]);
    }
    // Clean up any test reminders
    await pool.query("DELETE FROM reminders WHERE title LIKE 'Test Reminder%'");
    await pool.end();
  });

  describe("POST /api/reminders", () => {
    it("should create a new reminder", async () => {
      const reminderData = {
        title: "Test Reminder",
        description: "This is a test reminder",
        due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        status: "pending",
      };

      const response = await request(app)
        .post("/api/reminders")
        .send(reminderData)
        .expect(201);

      expect(response.body.status).toBe("success");
      expect(response.body.data).toHaveProperty("id");
      expect(response.body.data.title).toBe(reminderData.title);
      expect(response.body.data.description).toBe(reminderData.description);
      expect(response.body.data.status).toBe(reminderData.status);

      createdReminderId = response.body.data.id;
    });

    it("should return 400 if title is missing", async () => {
      const reminderData = {
        description: "Missing title",
        due_date: new Date().toISOString(),
      };

      const response = await request(app)
        .post("/api/reminders")
        .send(reminderData)
        .expect(400);

      expect(response.body.status).toBe("error");
      expect(response.body.message).toContain("Title is required");
    });

    it("should return 400 if due_date is missing", async () => {
      const reminderData = {
        title: "Missing due date",
      };

      const response = await request(app)
        .post("/api/reminders")
        .send(reminderData)
        .expect(400);

      expect(response.body.status).toBe("error");
      expect(response.body.message).toContain("Due date is required");
    });

    it("should support idempotency", async () => {
      const reminderData = {
        title: "Test Idempotent Reminder",
        description: "Testing idempotency",
        due_date: new Date(Date.now() + 86400000).toISOString(),
      };

      const idempotencyKey = uuidv4();

      // First request
      const response1 = await request(app)
        .post("/api/reminders")
        .set("Idempotency-Key", idempotencyKey)
        .send(reminderData)
        .expect(201);

      // Second request with same idempotency key
      const response2 = await request(app)
        .post("/api/reminders")
        .set("Idempotency-Key", idempotencyKey)
        .send(reminderData)
        .expect(201);

      // Should return the same reminder
      expect(response1.body.data.id).toBe(response2.body.data.id);

      // Clean up
      await pool.query("DELETE FROM reminders WHERE id = $1", [
        response1.body.data.id,
      ]);
    });
  });

  describe("GET /api/reminders", () => {
    it("should get all reminders", async () => {
      const response = await request(app).get("/api/reminders").expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body).toHaveProperty("count");
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe("GET /api/reminders/:id", () => {
    it("should get a reminder by ID", async () => {
      if (!createdReminderId) {
        // Create a reminder first
        const reminderData = {
          title: "Test Get Reminder",
          due_date: new Date(Date.now() + 86400000).toISOString(),
        };

        const createResponse = await request(app)
          .post("/api/reminders")
          .send(reminderData);

        createdReminderId = createResponse.body.data.id;
      }

      const response = await request(app)
        .get(`/api/reminders/${createdReminderId}`)
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data.id).toBe(createdReminderId);
    });

    it("should return 404 for non-existent reminder", async () => {
      const fakeId = uuidv4();

      const response = await request(app)
        .get(`/api/reminders/${fakeId}`)
        .expect(404);

      expect(response.body.status).toBe("error");
      expect(response.body.message).toContain("not found");
    });

    it("should return 400 for invalid UUID", async () => {
      const response = await request(app)
        .get("/api/reminders/invalid-uuid")
        .expect(400);

      expect(response.body.status).toBe("error");
      expect(response.body.message).toContain("Invalid UUID");
    });
  });

  describe("PUT /api/reminders/:id", () => {
    it("should update a reminder", async () => {
      if (!createdReminderId) {
        const reminderData = {
          title: "Test Update Reminder",
          due_date: new Date(Date.now() + 86400000).toISOString(),
        };

        const createResponse = await request(app)
          .post("/api/reminders")
          .send(reminderData);

        createdReminderId = createResponse.body.data.id;
      }

      const updateData = {
        title: "Updated Test Reminder",
        status: "completed",
      };

      const response = await request(app)
        .put(`/api/reminders/${createdReminderId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.status).toBe(updateData.status);
    });

    it("should return 404 for non-existent reminder", async () => {
      const fakeId = uuidv4();
      const updateData = {
        title: "Updated Title",
      };

      const response = await request(app)
        .put(`/api/reminders/${fakeId}`)
        .send(updateData)
        .expect(404);

      expect(response.body.status).toBe("error");
    });

    it("should return 400 if no fields provided", async () => {
      if (!createdReminderId) {
        const reminderData = {
          title: "Test Update Reminder",
          due_date: new Date(Date.now() + 86400000).toISOString(),
        };

        const createResponse = await request(app)
          .post("/api/reminders")
          .send(reminderData);

        createdReminderId = createResponse.body.data.id;
      }

      const response = await request(app)
        .put(`/api/reminders/${createdReminderId}`)
        .send({})
        .expect(400);

      expect(response.body.status).toBe("error");
      expect(response.body.message).toContain("At least one field");
    });
  });

  describe("DELETE /api/reminders/:id", () => {
    it("should delete a reminder", async () => {
      // Create a reminder to delete
      const reminderData = {
        title: "Test Delete Reminder",
        due_date: new Date(Date.now() + 86400000).toISOString(),
      };

      const createResponse = await request(app)
        .post("/api/reminders")
        .send(reminderData);

      const reminderId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/reminders/${reminderId}`)
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.message).toContain("deleted successfully");

      // Verify it's deleted
      await request(app).get(`/api/reminders/${reminderId}`).expect(404);
    });

    it("should return 404 for non-existent reminder", async () => {
      const fakeId = uuidv4();

      const response = await request(app)
        .delete(`/api/reminders/${fakeId}`)
        .expect(404);

      expect(response.body.status).toBe("error");
    });
  });

  describe("Health Check", () => {
    it("should return healthy status", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body.status).toBe("healthy");
      expect(response.body.service).toBe("Reminder Service");
    });
  });
});
