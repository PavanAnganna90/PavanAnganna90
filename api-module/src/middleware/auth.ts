import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '@/config/environment';
import { ApiResponse } from '@/types/api';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response: ApiResponse = {
        success: false,
        error: 'Access token required',
      };
      return res.status(401).json(response);
    }

    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    req.user = decoded;
    
    next();
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid or expired token',
    };
    return res.status(401).json(response);
  }
};

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response: ApiResponse = {
        success: false,
        error: 'Access token required',
      };
      return res.status(401).json(response);
    }

    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    req.user = decoded;
    
    next();
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid or expired token',
    };
    return res.status(401).json(response);
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'Authentication required',
      };
      return res.status(401).json(response);
    }

    if (!roles.includes(req.user.role)) {
      const response: ApiResponse = {
        success: false,
        error: 'Insufficient permissions',
      };
      return res.status(403).json(response);
    }

    next();
  };
};