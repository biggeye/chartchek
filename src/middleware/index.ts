import { authMiddleware } from './auth'
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Add CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    if (request.method === 'OPTIONS') {
      return response
    }
  }

  // Apply authentication middleware
  return authMiddleware(request)
}

// Re-export config from auth middleware
export { config } from './auth'
