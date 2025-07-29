import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect old dashboard routes to enhanced
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/') && !pathname.includes('/enhanced')) {
    const url = request.nextUrl.clone();
    
    // Special handling for sub-routes
    if (pathname === '/dashboard') {
      url.pathname = '/dashboard/enhanced';
    } else if (pathname.startsWith('/dashboard/posts') || 
               pathname.startsWith('/dashboard/users') ||
               pathname.startsWith('/dashboard/content')) {
      // Redirect content management routes to main dashboard
      url.pathname = '/dashboard/enhanced';
    }
    
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*']
};