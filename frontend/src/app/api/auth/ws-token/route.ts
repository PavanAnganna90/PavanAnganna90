import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

/**
 * Generate short-lived WebSocket authentication token
 * Endpoint: POST /api/auth/ws-token
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get('access_token');

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the access token
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('JWT_SECRET not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    try {
      const payload = jwt.verify(accessToken.value, JWT_SECRET) as any;
      
      // Generate short-lived WebSocket token (15 minutes)
      const wsToken = jwt.sign(
        {
          userId: payload.userId,
          email: payload.email,
          roles: payload.roles,
          type: 'websocket'
        },
        JWT_SECRET,
        { 
          expiresIn: '15m',
          issuer: 'opssight-frontend',
          audience: 'opssight-websocket'
        }
      );

      return NextResponse.json({ 
        token: wsToken,
        expiresIn: 15 * 60 // 15 minutes in seconds
      });

    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

  } catch (error) {
    console.error('WebSocket token generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Only allow POST method
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}