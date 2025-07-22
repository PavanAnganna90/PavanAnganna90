import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

/**
 * Secure login endpoint with httpOnly cookies
 * Endpoint: POST /api/auth/login
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // TODO: Replace with actual user lookup from database
    const user = await authenticateUser(email, password);
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
    
    if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
      console.error('JWT secrets not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Generate access token (15 minutes)
    const accessToken = jwt.sign(
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

    // Generate refresh token (7 days)
    const refreshToken = jwt.sign(
      {
        userId: user.id,
        type: 'refresh'
      },
      JWT_REFRESH_SECRET,
      { 
        expiresIn: '7d',
        issuer: 'opssight-frontend',
        audience: 'opssight-refresh'
      }
    );

    // Set secure httpOnly cookies
    const cookieStore = cookies();
    
    // Access token cookie
    cookieStore.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes
      path: '/'
    });

    // Refresh token cookie
    cookieStore.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/api/auth/refresh'
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles
      },
      expiresIn: 15 * 60 // 15 minutes
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Mock user authentication - replace with actual database lookup
 */
async function authenticateUser(email: string, password: string) {
  // TODO: Replace with actual database query
  const mockUsers = [
    {
      id: '1',
      email: 'admin@opssight.com',
      name: 'Admin User',
      passwordHash: await bcrypt.hash('admin123', 10), // In real app, this would be stored in DB
      roles: ['admin', 'user']
    },
    {
      id: '2',
      email: 'user@opssight.com',
      name: 'Regular User',
      passwordHash: await bcrypt.hash('user123', 10),
      roles: ['user']
    }
  ];

  const user = mockUsers.find(u => u.email === email);
  if (!user) {
    return null;
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roles: user.roles
  };
}

// Only allow POST method
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}