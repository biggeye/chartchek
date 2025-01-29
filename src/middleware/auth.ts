import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { config } from '@/lib/config'

export async function authMiddleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    config.supabase.url,
    config.supabase.anonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // Handle authentication
  if (!session && !isPublicRoute(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect from login to chat if already authenticated
  if (session && request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/chat', request.url))
  }

  return response
}

// Helper function to check if a route is public
function isPublicRoute(pathname: string): boolean {
  // Protected paths (require auth)
  const protectedPaths = [
    '/chat',
    '/documents',
    '/facilities'
  ]

  // Check if path is protected
  if (protectedPaths.some(path => pathname.startsWith(path))) {
    return false
  }

  // Public paths
  const publicPaths = [
    '/login',
    '/auth/signin',
    '/auth/signup',
    '/auth/reset-password',
    '/api/health'
  ]
  
  return publicPaths.includes(pathname) || 
         pathname.startsWith('/_next') || 
         pathname.startsWith('/api/') ||
         pathname.includes('.')
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
