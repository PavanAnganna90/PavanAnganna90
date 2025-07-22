import { NextRequest, NextResponse } from 'next/server';
import { setCSRFToken } from '@/lib/csrf';

/**
 * CSRF token generation endpoint
 * Endpoint: GET /api/csrf-token
 */
export async function GET(request: NextRequest) {
  try {
    // Generate and set CSRF token in httpOnly cookie
    const token = setCSRFToken();
    
    // Return token for client-side form submissions
    return NextResponse.json({ 
      csrfToken: token,
      message: 'CSRF token generated successfully'
    });

  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Only allow GET method
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}