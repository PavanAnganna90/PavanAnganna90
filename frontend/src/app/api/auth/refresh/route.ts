import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

/**
 * Token refresh endpoint
 * Endpoint: POST /api/auth/refresh
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const refreshToken = cookieStore.get('refresh_token');

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
    
    if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
      console.error('JWT secrets not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken.value, JWT_REFRESH_SECRET) as any;
      
      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // TODO: Check if refresh token exists in database and is not revoked
      
      // Get user details - in real app, fetch from database
      const user = await getUserById(payload.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate new access token
      const newAccessToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          roles: user.roles
        },
        JWT_SECRET,
        { 
          expiresIn: '15m',
          issuer: 'opssight-frontend',
          audience: 'opssight-api'
        }
      );

      // Set new access token cookie
      cookieStore.set('access_token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60, // 15 minutes
        path: '/'
      });

      return NextResponse.json({
        expiresIn: 15 * 60 // 15 minutes
      });

    } catch (jwtError) {
      console.error('Refresh token verification failed:', jwtError);
      
      // Clear invalid cookies
      cookieStore.delete('access_token');
      cookieStore.delete('refresh_token');
      
      return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
    }

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Mock user lookup - replace with actual database query
 */
async function getUserById(userId: string) {
  // TODO: Replace with actual database query
  const mockUsers = [
    {
      id: '1',
      email: 'admin@opssight.com',
      name: 'Admin User',
      roles: ['admin', 'user']
    },
    {
      id: '2',
      email: 'user@opssight.com',
      name: 'Regular User',
      roles: ['user']
    }
  ];

  return mockUsers.find(u => u.id === userId) || null;
}

// Only allow POST method
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}