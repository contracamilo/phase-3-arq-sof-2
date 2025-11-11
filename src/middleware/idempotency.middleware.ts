/**
 * Idempotency Middleware
 * Handles Idempotency-Key header for POST operations
 * Prevents duplicate resource creation and ensures idempotent behavior
 */

import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { ReminderRepository } from '../repositories/reminder.repository';
import { ValidationError, ConflictError } from './error.middleware';

const reminderRepository = new ReminderRepository();

/**
 * UUID v4 validation pattern
 */
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates Idempotency-Key header format
 */
function validateIdempotencyKey(key: string): boolean {
  return UUID_V4_PATTERN.test(key);
}

/**
 * Computes SHA-256 hash of request body for conflict detection
 */
function hashRequest(body: any): string {
  const normalized = JSON.stringify(body, Object.keys(body).sort());
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Idempotency middleware for POST operations
 * 
 * Behavior:
 * - If Idempotency-Key is missing: reject with 400
 * - If Idempotency-Key is invalid format: reject with 400
 * - If key exists with same request hash: return stored response (200 or 201)
 * - If key exists with different request hash: reject with 409
 * - If key is new: process request and store result
 */
export const idempotencyMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Only apply to POST requests
  if (req.method !== 'POST') {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'] as string;

  // Validate presence of idempotency key
  if (!idempotencyKey) {
    throw new ValidationError(
      'Idempotency-Key header is required for POST requests',
      req.path,
      [
        {
          field: 'Idempotency-Key',
          message: 'header is required',
          code: 'MISSING_HEADER'
        }
      ]
    );
  }

  // Validate format (must be UUID v4)
  if (!validateIdempotencyKey(idempotencyKey)) {
    throw new ValidationError(
      'Idempotency-Key must be a valid UUID v4',
      req.path,
      [
        {
          field: 'Idempotency-Key',
          message: 'must be a valid UUID v4',
          code: 'INVALID_FORMAT',
          example: '550e8400-e29b-41d4-a716-446655440000'
        }
      ]
    );
  }

  try {
    // Check if idempotency key already exists
    const existingRecord = await reminderRepository.findIdempotencyKey(idempotencyKey);

    if (existingRecord) {
      // Calculate hash of current request
      const currentHash = hashRequest(req.body);

      // If request body is different, return conflict
      if (currentHash !== existingRecord.requestHash) {
        throw new ConflictError(
          'A different request with the same Idempotency-Key was previously processed',
          req.path,
          'idempotency'
        );
      }

      // Return stored response for idempotent request
      return res
        .status(existingRecord.responseStatus)
        .type('application/json')
        .json(existingRecord.responseBody);
    }

    // Store idempotency key and request hash for later use
    (req as any).idempotencyKey = idempotencyKey;
    (req as any).requestHash = hashRequest(req.body);

    // Intercept response to store result
    const originalJson = res.json.bind(res);
    
    res.json = function (body: any) {
      // Only store successful responses (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Store idempotency record asynchronously (fire and forget)
        reminderRepository.saveIdempotencyKey({
          idempotencyKey,
          resourceId: body.id || body.data?.id || 'unknown',
          resourceType: 'reminder',
          requestHash: (req as any).requestHash,
          responseStatus: res.statusCode,
          responseBody: body
        }).catch(err => {
          console.error('Failed to save idempotency key:', err);
        });
      }

      return originalJson(body);
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Background job to cleanup expired idempotency keys
 * Should be run periodically (e.g., every hour)
 */
export async function cleanupIdempotencyKeys(): Promise<number> {
  try {
    const deleted = await reminderRepository.cleanupExpiredIdempotencyKeys();
    console.log(`Cleaned up ${deleted} expired idempotency keys`);
    return deleted;
  } catch (error) {
    console.error('Error cleaning up idempotency keys:', error);
    return 0;
  }
}

/**
 * Schedule periodic cleanup (every hour)
 */
export function scheduleIdempotencyCleanup(): NodeJS.Timer {
  const ONE_HOUR = 60 * 60 * 1000;
  return setInterval(cleanupIdempotencyKeys, ONE_HOUR);
}
