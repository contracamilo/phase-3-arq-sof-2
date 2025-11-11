/**
 * Component/Contract Tests
 * Black-box testing against REST API
 * Validates OpenAPI contract compliance
 */

import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import app from '../../app';

describe('Reminders API - Component Tests', () => {
  const baseUrl = '/v1/reminders';
  let createdReminderId: string;

  describe('POST /v1/reminders - Create Reminder', () => {
    it('should create a reminder with valid data', async () => {
      const idempotencyKey = uuidv4();
      const reminder = {
        userId: 'user-test',
        title: 'Component test reminder',
        dueAt: '2025-12-01T10:00:00Z',
        advanceMinutes: 30
      };

      const response = await request(app)
        .post(baseUrl)
        .set('Idempotency-Key', idempotencyKey)
        .send(reminder)
        .expect(201);

      expect(response.body).toMatchObject({
        userId: reminder.userId,
        title: reminder.title,
        status: 'pending',
        advanceMinutes: 30
      });

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
      
      expect(response.headers).toHaveProperty('location');
      
      createdReminderId = response.body.id;
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post(baseUrl)
        .set('Idempotency-Key', uuidv4())
        .send({
          userId: 'user-test'
          // Missing title and dueAt
        })
        .expect(400);

      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.body).toMatchObject({
        type: expect.stringContaining('/problems/'),
        title: 'Validation Error',
        status: 400
      });
      
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it('should return 400 for invalid date', async () => {
      const response = await request(app)
        .post(baseUrl)
        .set('Idempotency-Key', uuidv4())
        .send({
          userId: 'user-test',
          title: 'Test',
          dueAt: '2020-01-01T10:00:00Z', // Past date
          advanceMinutes: 30
        })
        .expect(400);

      expect(response.body).toMatchObject({
        status: 400,
        title: 'Validation Error'
      });

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'dueAt',
          code: 'INVALID_DATE'
        })
      );
    });

    it('should return 400 when Idempotency-Key is missing', async () => {
      const response = await request(app)
        .post(baseUrl)
        .send({
          userId: 'user-test',
          title: 'Test',
          dueAt: '2025-12-01T10:00:00Z'
        })
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'Idempotency-Key',
          code: 'MISSING_HEADER'
        })
      );
    });

    it('should return 200 for duplicate idempotent request', async () => {
      const idempotencyKey = uuidv4();
      const reminder = {
        userId: 'user-idempotent',
        title: 'Idempotent test',
        dueAt: '2025-12-01T10:00:00Z',
        advanceMinutes: 30
      };

      // First request
      const first = await request(app)
        .post(baseUrl)
        .set('Idempotency-Key', idempotencyKey)
        .send(reminder)
        .expect(201);

      // Second request with same key
      const second = await request(app)
        .post(baseUrl)
        .set('Idempotency-Key', idempotencyKey)
        .send(reminder)
        .expect(200);

      expect(first.body.id).toBe(second.body.id);
    });

    it('should return 409 for same key with different body', async () => {
      const idempotencyKey = uuidv4();

      // First request
      await request(app)
        .post(baseUrl)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          userId: 'user-conflict',
          title: 'Original',
          dueAt: '2025-12-01T10:00:00Z'
        })
        .expect(201);

      // Second request with same key but different body
      const response = await request(app)
        .post(baseUrl)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          userId: 'user-conflict',
          title: 'Different', // Changed
          dueAt: '2025-12-01T10:00:00Z'
        })
        .expect(409);

      expect(response.body).toMatchObject({
        status: 409,
        title: 'Idempotency Conflict'
      });
    });
  });

  describe('GET /v1/reminders - List Reminders', () => {
    it('should list reminders with pagination', async () => {
      const response = await request(app)
        .get(baseUrl)
        .query({ page: 1, limit: 20 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: expect.any(Number),
        totalPages: expect.any(Number)
      });
    });

    it('should filter by userId', async () => {
      const response = await request(app)
        .get(baseUrl)
        .query({ userId: 'user-test' })
        .expect(200);

      response.body.data.forEach((reminder: any) => {
        expect(reminder.userId).toBe('user-test');
      });
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get(baseUrl)
        .query({ status: 'pending' })
        .expect(200);

      response.body.data.forEach((reminder: any) => {
        expect(reminder.status).toBe('pending');
      });
    });
  });

  describe('GET /v1/reminders/:id - Get Reminder', () => {
    it('should get reminder by id', async () => {
      // Use reminder created in first test
      if (!createdReminderId) {
        const created = await request(app)
          .post(baseUrl)
          .set('Idempotency-Key', uuidv4())
          .send({
            userId: 'user-test',
            title: 'Get test',
            dueAt: '2025-12-01T10:00:00Z'
          })
          .expect(201);
        
        createdReminderId = created.body.id;
      }

      const response = await request(app)
        .get(`${baseUrl}/${createdReminderId}`)
        .expect(200);

      expect(response.body.id).toBe(createdReminderId);
    });

    it('should return 404 for non-existent reminder', async () => {
      const nonExistentId = uuidv4();
      
      const response = await request(app)
        .get(`${baseUrl}/${nonExistentId}`)
        .expect(404);

      expect(response.body).toMatchObject({
        status: 404,
        title: 'Not Found'
      });
    });
  });

  describe('PATCH /v1/reminders/:id - Update Reminder', () => {
    it('should update reminder title', async () => {
      const created = await request(app)
        .post(baseUrl)
        .set('Idempotency-Key', uuidv4())
        .send({
          userId: 'user-update',
          title: 'Original',
          dueAt: '2025-12-01T10:00:00Z'
        })
        .expect(201);

      const response = await request(app)
        .patch(`${baseUrl}/${created.body.id}`)
        .send({ title: 'Updated' })
        .expect(200);

      expect(response.body.title).toBe('Updated');
    });

    it('should update reminder status', async () => {
      const created = await request(app)
        .post(baseUrl)
        .set('Idempotency-Key', uuidv4())
        .send({
          userId: 'user-update',
          title: 'Status test',
          dueAt: '2025-12-01T10:00:00Z'
        })
        .expect(201);

      const response = await request(app)
        .patch(`${baseUrl}/${created.body.id}`)
        .send({ status: 'completed' })
        .expect(200);

      expect(response.body.status).toBe('completed');
    });
  });

  describe('DELETE /v1/reminders/:id - Delete Reminder', () => {
    it('should delete reminder', async () => {
      const created = await request(app)
        .post(baseUrl)
        .set('Idempotency-Key', uuidv4())
        .send({
          userId: 'user-delete',
          title: 'To delete',
          dueAt: '2025-12-01T10:00:00Z'
        })
        .expect(201);

      await request(app)
        .delete(`${baseUrl}/${created.body.id}`)
        .expect(204);

      // Verify deleted (should return cancelled status)
      const response = await request(app)
        .get(`${baseUrl}/${created.body.id}`)
        .expect(200);

      expect(response.body.status).toBe('cancelled');
    });
  });
});
