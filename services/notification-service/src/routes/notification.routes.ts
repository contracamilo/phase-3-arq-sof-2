/**
 * Notification Routes
 * CRUD operations for notification templates
 */

import { Router, Request, Response, NextFunction } from "express";
import winston from "winston";
import { templateService } from "../services/template.service";

const router = Router();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.json(),
  defaultMeta: { service: "notification-routes" },
  transports: [new winston.transports.Console()],
});

/**
 * GET /notifications/templates
 * List notification templates
 */
router.get("/templates", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = await templateService.getAllTemplates();

    logger.info("Templates retrieved", {
      count: templates.length,
      ip: req.ip,
    });

    res.json({ templates });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /notifications/templates
 * Create a new notification template
 */
router.post("/templates", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, titleTemplate, bodyTemplate } = req.body;

    if (!code || !titleTemplate || !bodyTemplate) {
      return res.status(400).json({
        error: "invalid_request",
        error_description: "code, titleTemplate, and bodyTemplate are required",
        status_code: 400,
        timestamp: new Date().toISOString(),
      });
    }

    const template = await templateService.createTemplate({
      code,
      titleTemplate,
      bodyTemplate,
    });

    logger.info("Template created", {
      code: template.code,
      ip: req.ip,
    });

    res.status(201).json(template);
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /notifications/templates/:code
 * Get a specific template
 */
router.get("/templates/:code", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    const template = await templateService.getTemplateByCode(code);

    if (!template) {
      return res.status(404).json({
        error: "not_found",
        error_description: "Template not found",
        status_code: 404,
        timestamp: new Date().toISOString(),
      });
    }

    res.json(template);
  } catch (error) {
    return next(error);
  }
});

/**
 * PUT /notifications/templates/:code
 * Update a template
 */
router.put("/templates/:code", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    const { titleTemplate, bodyTemplate } = req.body;

    const template = await templateService.updateTemplate(code, {
      titleTemplate,
      bodyTemplate,
    });

    if (!template) {
      return res.status(404).json({
        error: "not_found",
        error_description: "Template not found",
        status_code: 404,
        timestamp: new Date().toISOString(),
      });
    }

    logger.info("Template updated", {
      code: template.code,
      ip: req.ip,
    });

    res.json(template);
  } catch (error) {
    return next(error);
  }
});

/**
 * DELETE /notifications/templates/:code
 * Delete a template
 */
router.delete("/templates/:code", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    const deleted = await templateService.deleteTemplate(code);

    if (!deleted) {
      return res.status(404).json({
        error: "not_found",
        error_description: "Template not found",
        status_code: 404,
        timestamp: new Date().toISOString(),
      });
    }

    logger.info("Template deleted", {
      code,
      ip: req.ip,
    });

    res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;