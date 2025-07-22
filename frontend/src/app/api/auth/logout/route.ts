import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Secure logout endpoint
 * Endpoint: POST /api/auth/logout
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    
    // Clear all authentication cookies
    cookieStore.delete('access_token');
    cookieStore.delete('refresh_token');
    
    // TODO: In production, also revoke refresh token in database
    // await revokeRefreshToken(refreshToken);

    return NextResponse.json({ message: 'Logged out successfully' });

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Only allow POST method
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}