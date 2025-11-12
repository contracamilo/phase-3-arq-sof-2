/**
 * Template Service
 * Manages notification templates
 */

import winston from "winston";
import {
  templatesCreatedCounter,
  templatesUpdatedCounter,
  templatesDeletedCounter,
  templatesRetrievedCounter,
  templatesRenderedCounter,
  templateOperationErrorsCounter,
  templateRenderingDuration
} from "../instrumentation/opentelemetry";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.json(),
  defaultMeta: { service: "template-service" },
  transports: [new winston.transports.Console()],
});

export interface NotificationTemplate {
  id: string;
  code: string;
  titleTemplate: string;
  bodyTemplate: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTemplateDTO {
  code: string;
  titleTemplate: string;
  bodyTemplate: string;
}

export interface UpdateTemplateDTO {
  titleTemplate?: string;
  bodyTemplate?: string;
}

export class TemplateService {
  private templates: Map<string, NotificationTemplate> = new Map();

  constructor() {
    // Initialize with default templates
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    const defaultTemplates: NotificationTemplate[] = [
      {
        id: "1",
        code: "REMINDER_DUE",
        titleTemplate: "Recordatorio pendiente",
        bodyTemplate: "Tienes un recordatorio pendiente: {{title}}",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        code: "REMINDER_OVERDUE",
        titleTemplate: "Recordatorio vencido",
        bodyTemplate: "El recordatorio '{{title}}' ha vencido",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.code, template);
    });

    logger.info("Default templates initialized", { count: defaultTemplates.length });
  }

  async getAllTemplates(): Promise<NotificationTemplate[]> {
    try {
      const templates = Array.from(this.templates.values());
      templatesRetrievedCounter.add(templates.length, { operation: 'get_all' });
      return templates;
    } catch (error) {
      templateOperationErrorsCounter.add(1, { operation: 'get_all', error_type: 'unknown' });
      throw error;
    }
  }

  async getTemplateByCode(code: string): Promise<NotificationTemplate | null> {
    return this.templates.get(code) || null;
  }

  async createTemplate(dto: CreateTemplateDTO): Promise<NotificationTemplate> {
    try {
      if (this.templates.has(dto.code)) {
        templateOperationErrorsCounter.add(1, { operation: 'create', error_type: 'duplicate_code' });
        throw new Error(`Template with code ${dto.code} already exists`);
      }

      const template: NotificationTemplate = {
        id: Date.now().toString(),
        code: dto.code,
        titleTemplate: dto.titleTemplate,
        bodyTemplate: dto.bodyTemplate,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.templates.set(dto.code, template);

      templatesCreatedCounter.add(1, { template_type: 'custom', source: 'api' });

      logger.info("Template created", { code: dto.code });

      return template;
    } catch (error) {
      if (!this.templates.has(dto.code)) {
        templateOperationErrorsCounter.add(1, { operation: 'create', error_type: 'unknown' });
      }
      throw error;
    }
  }

  async updateTemplate(code: string, dto: UpdateTemplateDTO): Promise<NotificationTemplate | null> {
    try {
      const existing = this.templates.get(code);
      if (!existing) {
        templateOperationErrorsCounter.add(1, { operation: 'update', error_type: 'not_found' });
        return null;
      }

      const updated: NotificationTemplate = {
        ...existing,
        titleTemplate: dto.titleTemplate ?? existing.titleTemplate,
        bodyTemplate: dto.bodyTemplate ?? existing.bodyTemplate,
        updatedAt: new Date(),
      };

      this.templates.set(code, updated);

      templatesUpdatedCounter.add(1, { template_code: code, source: 'api' });

      logger.info("Template updated", { code });

      return updated;
    } catch (error) {
      templateOperationErrorsCounter.add(1, { operation: 'update', error_type: 'unknown' });
      throw error;
    }
  }

  async deleteTemplate(code: string): Promise<boolean> {
    try {
      const deleted = this.templates.delete(code);

      if (deleted) {
        templatesDeletedCounter.add(1, { template_code: code, source: 'api' });
        logger.info("Template deleted", { code });
      } else {
        templateOperationErrorsCounter.add(1, { operation: 'delete', error_type: 'not_found' });
      }

      return deleted;
    } catch (error) {
      templateOperationErrorsCounter.add(1, { operation: 'delete', error_type: 'unknown' });
      throw error;
    }
  }

  /**
   * Render template with variables
   */
  renderTemplate(code: string, variables: Record<string, any>): { title: string; body: string } | null {
    const startTime = Date.now();

    try {
      const template = this.templates.get(code);
      if (!template) {
        templateOperationErrorsCounter.add(1, { operation: 'render', error_type: 'template_not_found' });
        return null;
      }

      const render = (template: string, vars: Record<string, any>): string => {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
          return vars[key] !== undefined ? String(vars[key]) : match;
        });
      };

      const result = {
        title: render(template.titleTemplate, variables),
        body: render(template.bodyTemplate, variables),
      };

      const duration = Date.now() - startTime;
      templateRenderingDuration.record(duration, { template_code: code });

      // Business metric: template was successfully rendered for notification
      templatesRenderedCounter.add(1, { template_code: code, channel: 'email' });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      templateRenderingDuration.record(duration, { template_code: code, success: false });

      templateOperationErrorsCounter.add(1, { operation: 'render', error_type: 'unknown' });
      throw error;
    }
  }
}

export const templateService = new TemplateService();