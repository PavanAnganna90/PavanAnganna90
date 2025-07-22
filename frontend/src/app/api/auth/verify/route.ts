import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

/**
 * Session verification endpoint
 * Endpoint: GET /api/auth/verify
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get('access_token');

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token' }, { status: 401 });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('JWT_SECRET not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    try {
      const payload = jwt.verify(accessToken.value, JWT_SECRET) as any;
      
      // Get user details - in real app, fetch from database
      const user = await getUserById(payload.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Calculate remaining time
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = payload.exp - now;

      if (expiresIn <= 0) {
        throw new Error('Token expired');
      }

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles
        },
        expiresIn
      });

    } catch (jwtError) {
      console.error('Access token verification failed:', jwtError);
      
      // Clear invalid cookie
      cookieStore.delete('access_token');
      
      return NextResponse.json({ error: 'Invalid access token' }, { status: 401 });
    }

  } catch (error) {
    console.error('Session verification error:', error);
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

// Only allow GET method
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}