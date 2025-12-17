/**
 * Redis Caching Service
 *
 * Provides Redis caching with automatic memory fallback for when Redis is unavailable.
 * Supports session caching, progress tracking, and general key-value operations.
 */

import Redis from 'ioredis';

let redisClient: Redis | null = null;
let redisAvailable = false;

/**
 * Get or create Redis client
 */
export function getRedisClient(): Redis | null {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log('[Redis] No REDIS_URL configured, using memory fallback');
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 5000,
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connected successfully');
      redisAvailable = true;
    });

    redisClient.on('error', (err: Error) => {
      console.error('[Redis] Connection error:', err.message);
      redisAvailable = false;
    });

    redisClient.on('close', () => {
      console.log('[Redis] Connection closed');
      redisAvailable = false;
    });

    // Try to connect
    redisClient.connect().catch((err: Error) => {
      console.error('[Redis] Failed to connect:', err.message);
      redisAvailable = false;
    });

    return redisClient;
  } catch (error) {
    console.error('[Redis] Failed to initialize:', error);
    return null;
  }
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return redisAvailable && redisClient !== null;
}

/**
 * In-memory fallback cache for when Redis is unavailable
 */
const memoryCache = new Map<string, { value: string; expires: number }>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(memoryCache.entries());
  for (const [key, entry] of entries) {
    if (entry.expires > 0 && entry.expires < now) {
      memoryCache.delete(key);
    }
  }
}, 60000); // Clean every minute

/**
 * Cache operations with automatic fallback
 */
export const cache = {
  /**
   * Get a cached value
   */
  async get(key: string): Promise<string | null> {
    if (isRedisAvailable() && redisClient) {
      try {
        return await redisClient.get(key);
      } catch (error) {
        console.warn('[Redis] Get error, falling back to memory:', error);
      }
    }

    // Memory fallback
    const entry = memoryCache.get(key);
    if (entry) {
      if (entry.expires > 0 && entry.expires < Date.now()) {
        memoryCache.delete(key);
        return null;
      }
      return entry.value;
    }
    return null;
  },

  /**
   * Set a cached value with optional TTL
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (isRedisAvailable() && redisClient) {
      try {
        if (ttlSeconds) {
          await redisClient.setex(key, ttlSeconds, value);
        } else {
          await redisClient.set(key, value);
        }
        return;
      } catch (error) {
        console.warn('[Redis] Set error, falling back to memory:', error);
      }
    }

    // Memory fallback
    memoryCache.set(key, {
      value,
      expires: ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0,
    });
  },

  /**
   * Delete a cached value
   */
  async del(key: string): Promise<void> {
    if (isRedisAvailable() && redisClient) {
      try {
        await redisClient.del(key);
      } catch (error) {
        console.warn('[Redis] Del error:', error);
      }
    }
    memoryCache.delete(key);
  },

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    if (isRedisAvailable() && redisClient) {
      try {
        return (await redisClient.exists(key)) === 1;
      } catch (error) {
        console.warn('[Redis] Exists error, falling back to memory:', error);
      }
    }
    return memoryCache.has(key);
  },

  /**
   * Set expiration on a key
   */
  async expire(key: string, seconds: number): Promise<void> {
    if (isRedisAvailable() && redisClient) {
      try {
        await redisClient.expire(key, seconds);
        return;
      } catch (error) {
        console.warn('[Redis] Expire error:', error);
      }
    }

    // Memory fallback - update expiration
    const entry = memoryCache.get(key);
    if (entry) {
      entry.expires = Date.now() + seconds * 1000;
    }
  },

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    if (isRedisAvailable() && redisClient) {
      try {
        return await redisClient.incr(key);
      } catch (error) {
        console.warn('[Redis] Incr error, falling back to memory:', error);
      }
    }

    // Memory fallback
    const entry = memoryCache.get(key);
    const current = entry ? parseInt(entry.value, 10) : 0;
    const newValue = current + 1;
    memoryCache.set(key, {
      value: String(newValue),
      expires: entry?.expires || 0,
    });
    return newValue;
  },
};

/**
 * Session cache for user sessions
 */
export const sessionCache = {
  async setSession(userId: number, sessionData: Record<string, unknown>, ttlSeconds = 86400): Promise<void> {
    const key = `session:${userId}`;
    await cache.set(key, JSON.stringify(sessionData), ttlSeconds);
  },

  async getSession(userId: number): Promise<Record<string, unknown> | null> {
    const key = `session:${userId}`;
    const data = await cache.get(key);
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
    return null;
  },

  async clearSession(userId: number): Promise<void> {
    const key = `session:${userId}`;
    await cache.del(key);
  },
};

/**
 * Progress cache for insight generation
 */
export const progressCache = {
  async setProgress(
    insightId: number,
    progress: {
      status: string;
      percent: number;
      currentStep: string;
      sectionCount?: number;
      wordCount?: number;
    }
  ): Promise<void> {
    const key = `progress:${insightId}`;
    await cache.set(key, JSON.stringify(progress), 3600); // 1 hour TTL
  },

  async getProgress(insightId: number): Promise<{
    status: string;
    percent: number;
    currentStep: string;
    sectionCount?: number;
    wordCount?: number;
  } | null> {
    const key = `progress:${insightId}`;
    const data = await cache.get(key);
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
    return null;
  },

  async clearProgress(insightId: number): Promise<void> {
    const key = `progress:${insightId}`;
    await cache.del(key);
  },
};
