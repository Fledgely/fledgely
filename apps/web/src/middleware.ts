import { NextRequest, NextResponse } from 'next/server'
import { getSafeRedirectUrl } from '@/lib/security'

/**
 * Routes that require authentication
 */
const protectedRoutes = ['/dashboard', '/settings', '/family', '/children']

/**
 * Routes that are always public
 */
const publicRoutes = ['/login', '/privacy', '/terms', '/safety', '/safety-contact']

/**
 * Middleware for route protection
 *
 * Note: This is a basic implementation that checks for a session cookie.
 * Firebase Auth manages tokens client-side, so this primarily handles
 * initial navigation redirects. Full auth verification happens client-side.
 *
 * For production, consider using next-firebase-auth-edge for server-side
 * token verification.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for API routes, static files, and Next.js internals
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check for session indicator
  // Note: Firebase Auth stores auth state in IndexedDB, not cookies by default
  // This cookie would need to be set by the client after successful auth
  const sessionCookie = request.cookies.get('__session')?.value

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
  const isLoginPage = pathname === '/login'

  // Redirect unauthenticated users from protected routes to login
  if (isProtectedRoute && !sessionCookie) {
    const loginUrl = new URL('/login', request.url)
    // Preserve the intended destination for redirect after login
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users from login to dashboard
  if (isLoginPage && sessionCookie) {
    // Check if there's a redirect parameter (validated to prevent open redirects)
    const destination = getSafeRedirectUrl(request.nextUrl.searchParams.get('redirect'))
    return NextResponse.redirect(new URL(destination, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (files with extensions)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
