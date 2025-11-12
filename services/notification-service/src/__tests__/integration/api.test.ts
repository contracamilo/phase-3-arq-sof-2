/**
 * Integration Tests for Notification Service API
 */

import request from 'supertest';
import app from '../../app';

describe('Notification Service API', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('service', 'notification-service');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /ready', () => {
    it('should return readiness status', async () => {
      const response = await request(app)
        .get('/ready')
        .expect(200);

      expect(response.body).toHaveProperty('ready', true);
      expect(response.body).toHaveProperty('service', 'notification-service');
    });
  });

  describe('GET /', () => {
    it('should return service information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Notification Service API');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body.endpoints).toHaveProperty('health');
      expect(response.body.endpoints).toHaveProperty('docs', '/api-docs');
      expect(response.body.endpoints).toHaveProperty('openapi', '/openapi.yaml');
    });
  });

  describe('GET /api-docs', () => {
    it('should serve Swagger UI', async () => {
      const response = await request(app)
        .get('/api-docs/')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/html');
      expect(response.text).toContain('swagger');
    });
  });

  describe('GET /openapi.yaml', () => {
    it('should serve OpenAPI specification', async () => {
      const response = await request(app)
        .get('/openapi.yaml')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/yaml');
      expect(response.text).toContain('openapi:');
      expect(response.text).toContain('Notification Service API');
    });
  });

  describe('GET /notifications/templates', () => {
    it('should return notification templates', async () => {
      const response = await request(app)
        .get('/notifications/templates')
        .expect(200);

      expect(response.body).toHaveProperty('templates');
      expect(Array.isArray(response.body.templates)).toBe(true);
      expect(response.body.templates.length).toBeGreaterThan(0);

      // Check template structure
      const template = response.body.templates[0];
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('code');
      expect(template).toHaveProperty('titleTemplate');
      expect(template).toHaveProperty('bodyTemplate');
    });
  });

  describe('POST /notifications/templates', () => {
    it('should create a new template', async () => {
      const newTemplate = {
        code: 'INTEGRATION_TEST',
        titleTemplate: 'Integration Test Title',
        bodyTemplate: 'Integration test body content'
      };

      const response = await request(app)
        .post('/notifications/templates')
        .send(newTemplate)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.code).toBe(newTemplate.code);
      expect(response.body.titleTemplate).toBe(newTemplate.titleTemplate);
      expect(response.body.bodyTemplate).toBe(newTemplate.bodyTemplate);
    });

    it('should return error for missing required fields', async () => {
      const incompleteTemplate = {
        code: 'INCOMPLETE_TEST'
        // Missing titleTemplate and bodyTemplate
      };

      const response = await request(app)
        .post('/notifications/templates')
        .send(incompleteTemplate)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'invalid_request');
      expect(response.body.error_description).toContain('required');
    });
  });

  describe('GET /notifications/templates/:code', () => {
    it('should return specific template', async () => {
      const response = await request(app)
        .get('/notifications/templates/REMINDER_DUE')
        .expect(200);

      expect(response.body).toHaveProperty('code', 'REMINDER_DUE');
      expect(response.body).toHaveProperty('titleTemplate');
      expect(response.body).toHaveProperty('bodyTemplate');
    });

    it('should return 404 for non-existent template', async () => {
      const response = await request(app)
        .get('/notifications/templates/NON_EXISTENT')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'not_found');
    });
  });
});