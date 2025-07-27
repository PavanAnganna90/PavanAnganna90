import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import logger from '@/utils/logger';
import { ApiResponse } from '@/types/api';
import config from '@/config/environment';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal server error';

  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = 400;
    switch (error.code) {
      case 'P2002':
        message = 'Resource already exists';
        break;
      case 'P2025':
        message = 'Resource not found';
        break;
      default:
        message = 'Database operation failed';
    }
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Invalid data provided';
  }

  const response: ApiResponse = {
    success: false,
    error: message,
  };

  if (config.NODE_ENV === 'development') {
    response.data = {
      stack: error.stack,
      details: error.message,
    };
  }

  res.status(statusCode).json(response);
};

export const notFoundHandler = (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: false,
    error: `Route ${req.originalUrl} not found`,
  };
  res.status(404).json(response);
};