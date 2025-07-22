/**
 * CSRF Protection Library
 * Generates and validates CSRF tokens for form submissions
 */

import { cookies } from 'next/headers';
import crypto from 'crypto';

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Set CSRF token in httpOnly cookie
 */
export function setCSRFToken(): string {
  const token = generateCSRFToken();
  
  const cookieStore = cookies();
  cookieStore.set('csrf_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60, // 1 hour
    path: '/'
  });

  return token;
}

/**
 * Get CSRF token from cookie
 */
export function getCSRFToken(): string | null {
  const cookieStore = cookies();
  const csrfCookie = cookieStore.get('csrf_token');
  return csrfCookie?.value || null;
}

/**
 * Validate CSRF token from request
 */
export function validateCSRFToken(submittedToken: string): boolean {
  const storedToken = getCSRFToken();
  
  if (!storedToken || !submittedToken) {
    return false;
  }

  // Use constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(storedToken, 'hex'),
      Buffer.from(submittedToken, 'hex')
    );
  } catch (error) {
    // Tokens are different lengths or invalid format
    return false;
  }
}

/**
 * CSRF middleware for API routes
 */
export function withCSRFProtection(handler: Function) {
  return async (request: Request, ...args: any[]) => {
    // Only check CSRF for state-changing methods
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method!)) {
      const csrfToken = request.headers.get('x-csrf-token');
      
      if (!csrfToken || !validateCSRFToken(csrfToken)) {
        return new Response(
          JSON.stringify({ error: 'Invalid CSRF token' }),
          { 
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    return handler(request, ...args);
  };
}