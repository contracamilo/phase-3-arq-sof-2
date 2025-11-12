/**
 * Unit Tests for Template Service
 */

import { TemplateService } from '../../services/template.service';

describe('TemplateService', () => {
  let service: TemplateService;

  beforeEach(() => {
    service = new TemplateService();
  });

  describe('getAllTemplates', () => {
    it('should return all templates', async () => {
      const templates = await service.getAllTemplates();
      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should include default templates', async () => {
      const templates = await service.getAllTemplates();
      const codes = templates.map((t: any) => t.code);
      expect(codes).toContain('REMINDER_DUE');
      expect(codes).toContain('REMINDER_OVERDUE');
    });
  });

  describe('getTemplateByCode', () => {
    it('should return template by code', async () => {
      const template = await service.getTemplateByCode('REMINDER_DUE');
      expect(template).toBeDefined();
      expect(template?.code).toBe('REMINDER_DUE');
    });

    it('should return null for non-existent template', async () => {
      const template = await service.getTemplateByCode('NON_EXISTENT');
      expect(template).toBeNull();
    });
  });

  describe('createTemplate', () => {
    it('should create a new template', async () => {
      const dto = {
        code: 'TEST_TEMPLATE',
        titleTemplate: 'Test Title',
        bodyTemplate: 'Test Body'
      };

      const template = await service.createTemplate(dto);
      expect(template).toBeDefined();
      expect(template.code).toBe(dto.code);
      expect(template.titleTemplate).toBe(dto.titleTemplate);
      expect(template.bodyTemplate).toBe(dto.bodyTemplate);
    });

    it('should throw error for duplicate code', async () => {
      const dto = {
        code: 'REMINDER_DUE', // Already exists
        titleTemplate: 'Test Title',
        bodyTemplate: 'Test Body'
      };

      await expect(service.createTemplate(dto)).rejects.toThrow('already exists');
    });
  });

  describe('renderTemplate', () => {
    it('should render template with variables', () => {
      const result = service.renderTemplate('REMINDER_DUE', { title: 'Test Reminder' });
      expect(result).toBeDefined();
      expect(result?.title).toBe('Recordatorio pendiente');
      expect(result?.body).toBe('Tienes un recordatorio pendiente: Test Reminder');
    });

    it('should return null for non-existent template', () => {
      const result = service.renderTemplate('NON_EXISTENT', {});
      expect(result).toBeNull();
    });

    it('should handle missing variables gracefully', () => {
      const result = service.renderTemplate('REMINDER_DUE', {});
      expect(result).toBeDefined();
      expect(result?.title).toBe('Recordatorio pendiente');
      expect(result?.body).toBe('Tienes un recordatorio pendiente: {{title}}'); // Unreplaced variable
    });
  });
});