import { NextResponse } from "next/server";
import { env } from "./env";

type RateLimitResult = { success: true } | { success: false; response: NextResponse };

/**
 * Rate limit for AI endpoints. Uses Upstash Redis when configured.
 * When UPSTASH_REDIS_REST_URL/TOKEN are missing, allows all requests.
 *
 * Limit: 20 requests per minute per identifier (user ID or IP).
 */
export async function checkAiRateLimit(identifier: string): Promise<RateLimitResult> {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return { success: true };
  }

  try {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");

    const ratelimit = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(20, "1 m"),
      analytics: true,
    });

    const { success, limit, remaining } = await ratelimit.limit(identifier);

    if (!success) {
      return {
        success: false,
        response: NextResponse.json(
          {
            error: "Příliš mnoho požadavků. Zkus to znovu za minutu.",
            retryAfter: 60,
          },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": String(limit),
              "X-RateLimit-Remaining": String(remaining),
              "Retry-After": "60",
            },
          }
        ),
      };
    }

    return { success: true };
  } catch {
    // On Redis error, allow the request (fail open)
    return { success: true };
  }
}
