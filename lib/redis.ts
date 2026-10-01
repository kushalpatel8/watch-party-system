import { Redis } from '@upstash/redis';

// REST client for caching and rate limiting
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Cache room play state in Redis.
 * key: room:{code}:state  TTL: 24h
 */
export async function cacheRoomState(code: string, state: object) {
  try {
    await redis.setex(`room:${code}:state`, 86400, JSON.stringify(state));
  } catch (err) {
    console.warn('[redis] cacheRoomState failed:', err);
  }
}

export async function getRoomState(code: string): Promise<any | null> {
  try {
    const raw = await redis.get<string>(`room:${code}:state`);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}
