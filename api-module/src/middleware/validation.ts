import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
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
          data: error.errors.map(err => ({
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