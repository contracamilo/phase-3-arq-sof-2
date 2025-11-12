/**
 * Template Service
 * Manages notification templates
 */

import winston from "winston";

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
    return Array.from(this.templates.values());
  }

  async getTemplateByCode(code: string): Promise<NotificationTemplate | null> {
    return this.templates.get(code) || null;
  }

  async createTemplate(dto: CreateTemplateDTO): Promise<NotificationTemplate> {
    if (this.templates.has(dto.code)) {
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

    logger.info("Template created", { code: dto.code });

    return template;
  }

  async updateTemplate(code: string, dto: UpdateTemplateDTO): Promise<NotificationTemplate | null> {
    const existing = this.templates.get(code);
    if (!existing) {
      return null;
    }

    const updated: NotificationTemplate = {
      ...existing,
      titleTemplate: dto.titleTemplate ?? existing.titleTemplate,
      bodyTemplate: dto.bodyTemplate ?? existing.bodyTemplate,
      updatedAt: new Date(),
    };

    this.templates.set(code, updated);

    logger.info("Template updated", { code });

    return updated;
  }

  async deleteTemplate(code: string): Promise<boolean> {
    const deleted = this.templates.delete(code);

    if (deleted) {
      logger.info("Template deleted", { code });
    }

    return deleted;
  }

  /**
   * Render template with variables
   */
  renderTemplate(code: string, variables: Record<string, any>): { title: string; body: string } | null {
    const template = this.templates.get(code);
    if (!template) {
      return null;
    }

    const render = (template: string, vars: Record<string, any>): string => {
      return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return vars[key] !== undefined ? String(vars[key]) : match;
      });
    };

    return {
      title: render(template.titleTemplate, variables),
      body: render(template.bodyTemplate, variables),
    };
  }
}

export const templateService = new TemplateService();