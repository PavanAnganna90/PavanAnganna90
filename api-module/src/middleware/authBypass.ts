import { Request, Response, NextFunction } from 'express';
import { UserService } from '@/services/user.service';
import { JwtService } from '@/utils/jwt';
import config from '@/config/environment';
import { ApiResponse } from '@/types/api';
import logger from '@/utils/logger';

export interface BypassAuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class AuthBypassService {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * Creates or gets development user for SSO bypass
   */
  async getOrCreateDevUser() {
    try {
      // Try to find existing dev user
      const existingUser = await this.userService.login(
        config.DEV_DEFAULT_USER_EMAIL,
        config.DEV_DEFAULT_USER_PASSWORD
      );
      return existingUser;
    } catch (error) {
      // Create dev user if doesn't exist
      logger.info('Creating development user for SSO bypass');
      return await this.userService.createUser({
        email: config.DEV_DEFAULT_USER_EMAIL,
        name: 'Development User',
        password: config.DEV_DEFAULT_USER_PASSWORD,
        role: 'ADMIN', // Give admin access for development
      });
    }
  }
}

/**
 * Middleware to bypass SSO authentication in development
 */
export const ssoBypassMiddleware = async (
  req: BypassAuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Only apply bypass in development and when enabled
  if (config.NODE_ENV !== 'development' || !config.SSO_BYPASS_DEV) {
    return next();
  }

  try {
    const authBypass = new AuthBypassService();
    const { user, token } = await authBypass.getOrCreateDevUser();

    // Set user in request object
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    // Add bypass header
    res.setHeader('X-Auth-Bypass', 'development');
    
    logger.debug('SSO bypass applied for development user', {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    next();
  } catch (error) {
    logger.error('SSO bypass failed:', error);
    next(); // Continue without bypass if it fails
  }
};

/**
 * Endpoint to get development auth token
 */
export const getDevAuthToken = async (req: Request, res: Response) => {
  if (config.NODE_ENV !== 'development' || !config.SSO_BYPASS_DEV) {
    const response: ApiResponse = {
      success: false,
      error: 'Development authentication not available in this environment',
    };
    return res.status(403).json(response);
  }

  try {
    const authBypass = new AuthBypassService();
    const { user, token } = await authBypass.getOrCreateDevUser();

    const response: ApiResponse = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
        message: 'Development authentication successful',
        bypass: true,
      },
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create development authentication',
    };
    res.status(500).json(response);
  }
};

/**
 * Conditional authentication middleware
 * Uses SSO bypass in development, regular auth in production
 */
export const conditionalAuth = (req: BypassAuthRequest, res: Response, next: NextFunction) => {
  // Apply SSO bypass in development
  if (config.NODE_ENV === 'development' && config.SSO_BYPASS_DEV) {
    return ssoBypassMiddleware(req, res, next);
  }

  // Use regular authentication in production
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const response: ApiResponse = {
      success: false,
      error: 'Access token required',
    };
    return res.status(401).json(response);
  }

  try {
    const token = authHeader.substring(7);
    const decoded = JwtService.verifyToken(token);
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