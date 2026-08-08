import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let userHourly: Ratelimit | undefined;
let userDaily: Ratelimit | undefined;
let ipHourly: Ratelimit | undefined;
let ipDaily: Ratelimit | undefined;

function getLimiters() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const redis = new Redis({ url, token });
  userHourly ??= new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    prefix: "canopy:ai:user:hour",
  });
  userDaily ??= new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 d"),
    prefix: "canopy:ai:user:day",
  });
  ipHourly ??= new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 h"),
    prefix: "canopy:ai:ip:hour",
  });
  ipDaily ??= new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, "1 d"),
    prefix: "canopy:ai:ip:day",
  });
  return { userHourly, userDaily, ipHourly, ipDaily };
}

export async function enforceAiRateLimit(userId: string, ipAddress: string) {
  const limiters = getLimiters();
  if (!limiters) {
    return {
      allowed: false,
      retryAfter: 0,
      reason: "AI usage controls are unavailable.",
    };
  }
  const results = await Promise.all([
    limiters.userHourly.limit(userId),
    limiters.userDaily.limit(userId),
    limiters.ipHourly.limit(ipAddress),
    limiters.ipDaily.limit(ipAddress),
  ]);
  const rejected = results.find((result) => !result.success);
  return rejected
    ? {
        allowed: false,
        retryAfter: Math.max(
          1,
          Math.ceil((rejected.reset - Date.now()) / 1000),
        ),
        reason: "AI practice limit reached. Please return later.",
      }
    : { allowed: true, retryAfter: 0, reason: "" };
}
