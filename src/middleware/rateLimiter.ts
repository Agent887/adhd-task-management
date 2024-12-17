import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { KVNamespace } from '@cloudflare/workers-types';

declare global {
  const AI_RATE_LIMIT: KVNamespace;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  costPerRequest?: number;
}

const defaultConfig: RateLimitConfig = {
  maxRequests: 50,  // requests per window
  windowMs: 60000,  // 1 minute window
};

export async function rateLimiter(
  request: NextRequest,
  config: RateLimitConfig = defaultConfig
) {
  const ip = request.ip || 'anonymous';
  const key = `rate-limit:${ip}`;

  try {
    // Get current usage
    const usage = await AI_RATE_LIMIT.get(key, 'json') || { count: 0, resetTime: Date.now() };

    // Reset if window has expired
    if (Date.now() > usage.resetTime) {
      usage.count = 0;
      usage.resetTime = Date.now() + config.windowMs;
    }

    // Check if rate limit exceeded
    if (usage.count >= config.maxRequests) {
      return new NextResponse('Rate limit exceeded', {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((usage.resetTime - Date.now()) / 1000)),
        },
      });
    }

    // Increment usage
    usage.count++;
    await AI_RATE_LIMIT.put(key, JSON.stringify(usage), {
      expirationTtl: Math.ceil(config.windowMs / 1000),
    });

    return null; // Continue to next middleware/handler
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Fail open - allow request to proceed if rate limiting fails
    return null;
  }
}

// Specific rate limiter for AI endpoints
export async function aiRateLimiter(request: NextRequest) {
  const aiConfig: RateLimitConfig = {
    maxRequests: 100,  // 100 AI requests per window
    windowMs: 300000,  // 5 minute window
  };

  return rateLimiter(request, aiConfig);
}

// OpenRouter specific rate limits
const openRouterConfig: RateLimitConfig = {
  maxRequests: 100,  // OpenRouter requests per window
  windowMs: 300000,  // 5 minute window
  costPerRequest: 1, // Base cost per request
};

// OpenRouter specific rate limiter
export async function openRouterRateLimiter(
  request: NextRequest,
  estimatedTokens: number = 500
): Promise<NextResponse | null> {
  const config = {
    ...openRouterConfig,
    costPerRequest: Math.ceil(estimatedTokens / 1000), // Adjust cost based on estimated tokens
  };

  return rateLimiter(request, config);
}

// Usage tracking for specific features
export async function trackFeatureUsage(
  userId: string,
  feature: string
): Promise<void> {
  const key = `feature-usage:${userId}:${feature}`;
  
  try {
    const usage = await AI_RATE_LIMIT.get(key, 'json') || {
      count: 0,
      firstUse: Date.now(),
      lastUse: Date.now(),
    };

    usage.count++;
    usage.lastUse = Date.now();

    await AI_RATE_LIMIT.put(key, JSON.stringify(usage));
  } catch (error) {
    console.error('Feature tracking error:', error);
  }
}
