import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, z, ZodError } from 'zod';
import { ApiResponse } from '@/types/api';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const response: ApiResponse = {
          success: false,
          error: 'Validation failed',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        };
        return res.status(400).json(response);
      }
      next(error);
    }
  };
};

export const validateBody = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = await schema.parseAsync(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const response: ApiResponse = {
          success: false,
          error: 'Validation failed',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        };
        return res.status(400).json(response);
      }
      next(error);
    }
  };
};

export const validateQuery = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = await schema.parseAsync(req.query);
      req.query = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const response: ApiResponse = {
          success: false,
          error: 'Query validation failed',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        };
        return res.status(400).json(response);
      }
      next(error);
    }
  };
};

export const validateParams = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = await schema.parseAsync(req.params);
      req.params = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const response: ApiResponse = {
          success: false,
          error: 'Parameter validation failed',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        };
        return res.status(400).json(response);
      }
      next(error);
    }
  };
};