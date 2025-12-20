import { Redis } from 'ioredis';

// Check if Redis is configured
const isRedisConfigured = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  return url && !url.includes('example');
};

// Create Redis client for BullMQ (only if configured)
const getRedisUrl = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  if (!url) {
    return null;
  }
  // Convert REST URL to standard Redis URL if needed
  return url.replace('https://', 'rediss://').replace('.upstash.io', '.upstash.io:6379');
};

// Singleton pattern for Redis connection
const globalForRedis = globalThis as unknown as {
  redis: Redis | null | undefined;
};

// Only create Redis client if configured
let redis: Redis | null = null;

if (isRedisConfigured()) {
  const redisUrl = getRedisUrl();
  if (redisUrl) {
    redis = globalForRedis.redis ?? new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      password: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    if (process.env.NODE_ENV !== 'production') {
      globalForRedis.redis = redis;
    }
  }
}

// Queue names
export const QUEUES = {
  GENERATION: 'seetu:generation',
  EXPORT: 'seetu:export',
  BACKGROUND_REMOVAL: 'seetu:background-removal',
} as const;

// Mock queue for development (in-memory)
const devQueue: Record<string, string[]> = {
  [QUEUES.GENERATION]: [],
  [QUEUES.EXPORT]: [],
  [QUEUES.BACKGROUND_REMOVAL]: [],
};

// Queue helpers that work with or without Redis
export async function queuePush(queue: string, data: string): Promise<void> {
  if (redis) {
    await redis.rpush(queue, data);
  } else {
    // Development: store in memory (won't persist)
    devQueue[queue] = devQueue[queue] || [];
    devQueue[queue].push(data);
  }
}

export async function queuePop(queue: string): Promise<string | null> {
  if (redis) {
    return redis.lpop(queue);
  } else {
    const q = devQueue[queue] || [];
    return q.shift() || null;
  }
}

// Cache helpers (noop if no Redis)
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

export async function cacheSet<T>(
  key: string,
  value: T,
  expiresInSeconds = 3600
): Promise<void> {
  if (!redis) return;
  await redis.setex(key, expiresInSeconds, JSON.stringify(value));
}

export async function cacheDelete(key: string): Promise<void> {
  if (!redis) return;
  await redis.del(key);
}

export async function cacheDeletePattern(pattern: string): Promise<void> {
  if (!redis) return;
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

export { redis, isRedisConfigured };
export default redis;
