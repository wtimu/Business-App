import type { NextFunction, Request, Response } from 'express';
import { logger } from '../lib/logger.js';

export class HttpError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof HttpError) {
    logger.warn({ error }, 'Handled HTTP error');
    return res.status(error.statusCode).json({ message: error.message, details: error.details });
  }

  logger.error({ error }, 'Unhandled error');
  return res.status(500).json({ message: 'Internal server error' });
};
