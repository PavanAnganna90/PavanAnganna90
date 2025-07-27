import jwt from 'jsonwebtoken';
import config from '@/config/environment';

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

export class JwtService {
  static generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    });
  }

  static verifyToken(token: string): JwtPayload {
    return jwt.verify(token, config.JWT_SECRET) as JwtPayload;
  }

  static decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }
}