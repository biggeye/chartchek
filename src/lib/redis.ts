import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

// Create Redis client only if configuration exists
const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

export const redis = redisUrl && redisToken
  ? new Redis({
      url: redisUrl,
      token: redisToken,
    })
  : null

// Create rate limiter only if Redis is configured
const rateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
    })
  : null

export async function rateLimit(key: string, limit: number, window: number) {
  if (!rateLimiter) {
    // If Redis is not configured, allow all requests
    return { success: true, remaining: limit }
  }

  try {
    const { success, reset, remaining } = await rateLimiter.limit(key)
    return { success, remaining, reset }
  } catch (error) {
    console.warn('[Redis] Rate limiting failed:', error)
    // If rate limiting fails, allow the request
    return { success: true, remaining: limit }
  }
}
