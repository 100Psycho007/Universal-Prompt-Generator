import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rate limiting store: Map<key, { count: number; resetTime: number }>
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  USER_LIMIT: 100, // 100 requests per minute per user
  IP_LIMIT: 1000, // 1000 requests per minute per IP
  WINDOW_MS: 60 * 1000 // 1 minute window
}

const getClientIP = (request: NextRequest): string => {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    request.ip ||
    'unknown'
  ).trim()
}

const isRateLimited = (key: string, limit: number): boolean => {
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record || now > record.resetTime) {
    // Reset or initialize
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_CONFIG.WINDOW_MS })
    return false
  }

  record.count++
  return record.count > limit
}

const shouldSkipRateLimit = (pathname: string): boolean => {
  // Skip rate limiting for certain paths
  const skipPaths = [
    '/_next/',
    '/favicon.ico',
    '/robots.txt',
    '/public/',
    '/static/',
    '/api/auth/callback' // OAuth callback shouldn't be rate limited
  ]

  return skipPaths.some((path) => pathname.startsWith(path))
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip rate limiting for non-API paths and static assets
  if (!shouldSkipRateLimit(pathname)) {
    const clientIP = getClientIP(request)

    // Check IP rate limit
    const ipKey = `ip:${clientIP}`
    if (isRateLimited(ipKey, RATE_LIMIT_CONFIG.IP_LIMIT)) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.'
          }
        },
        { status: 429 }
      )
    }

    // Get session to check user rate limit
    const response = NextResponse.next()
    const supabase = createMiddlewareClient({ req: request, res: response })
    const {
      data: { session }
    } = await supabase.auth.getSession()

    if (session?.user?.id) {
      const userKey = `user:${session.user.id}`
      if (isRateLimited(userKey, RATE_LIMIT_CONFIG.USER_LIMIT)) {
        return NextResponse.json(
          {
            error: {
              code: 'RATE_LIMITED',
              message: 'Too many requests. Please try again later.'
            }
          },
          { status: 429 }
        )
      }
    }

    return response
  }

  // Standard session handling for non-rate-limited paths
  const response = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res: response })

  await supabase.auth.getSession()

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
