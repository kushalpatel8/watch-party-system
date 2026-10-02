import { Redis } from '@upstash/redis';

// REST client for ultra-fast caching and rate limiting over Upstash Edge
export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const CACHE_TTL_SECONDS = 86400; // 24 hours

/**
 * Get room complete snapshot from Upstash Redis cache (<15ms).
 */
export async function getRoomDataCache(code: string): Promise<any | null> {
  if (!redis) return null;
  try {
    const raw = await redis.get<any>(`room:${code.toUpperCase()}:data`);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (err) {
    console.warn('[redis] getRoomDataCache error:', err);
    return null;
  }
}

/**
 * Set room complete snapshot in Upstash Redis cache.
 */
export async function setRoomDataCache(code: string, data: any, ttl = CACHE_TTL_SECONDS): Promise<void> {
  if (!redis) return;
  try {
    const serialized = typeof data === 'string' ? data : JSON.stringify(data);
    await redis.set(`room:${code.toUpperCase()}:data`, serialized, { ex: ttl });
  } catch (err) {
    console.warn('[redis] setRoomDataCache error:', err);
  }
}

/**
 * Invalidate room data cache in Upstash Redis.
 */
export async function invalidateRoomDataCache(code: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(`room:${code.toUpperCase()}:data`);
  } catch (err) {
    console.warn('[redis] invalidateRoomDataCache error:', err);
  }
}

/**
 * Cache user profile in Upstash Redis.
 */
export async function setUserProfileCache(
  userId: string,
  profile: { username: string; imageUrl?: string }
): Promise<void> {
  if (!redis || !userId) return;
  try {
    await redis.set(`user:${userId}:profile`, JSON.stringify(profile), { ex: CACHE_TTL_SECONDS });
  } catch (err) {
    console.warn('[redis] setUserProfileCache error:', err);
  }
}

/**
 * Get user profile from Upstash Redis.
 */
export async function getUserProfileCache(userId: string): Promise<{ username: string; imageUrl?: string } | null> {
  if (!redis || !userId) return null;
  try {
    const raw = await redis.get<any>(`user:${userId}:profile`);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (err) {
    console.warn('[redis] getUserProfileCache error:', err);
    return null;
  }
}

/**
 * Batch fetch user profiles from Upstash Redis.
 */
export async function getMultipleUserProfiles(userIds: string[]): Promise<Map<string, { username: string; imageUrl?: string }>> {
  const map = new Map<string, { username: string; imageUrl?: string }>();
  if (!redis || userIds.length === 0) return map;
  try {
    const keys = userIds.map((id) => `user:${id}:profile`);
    const results = await redis.mget<any[]>(...keys);
    userIds.forEach((id, idx) => {
      const val = results[idx];
      if (val) {
        const parsed = typeof val === 'string' ? JSON.parse(val) : val;
        map.set(id, parsed);
      }
    });
  } catch (err) {
    console.warn('[redis] getMultipleUserProfiles error:', err);
  }
  return map;
}

/**
 * Cache room play state in Redis.
 */
export async function cacheRoomState(code: string, state: object) {
  if (!redis) return;
  try {
    await redis.set(`room:${code.toUpperCase()}:state`, JSON.stringify(state), { ex: CACHE_TTL_SECONDS });
  } catch (err) {
    console.warn('[redis] cacheRoomState failed:', err);
  }
}

export async function getRoomState(code: string): Promise<any | null> {
  if (!redis) return null;
  try {
    const raw = await redis.get<string>(`room:${code.toUpperCase()}:state`);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

