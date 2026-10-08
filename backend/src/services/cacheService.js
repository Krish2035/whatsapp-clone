const { getRedisClient, isRedisAvailable } = require('../config/redis');

// In-Memory Fallback Cache when Redis is not running
class MemoryCache {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlSeconds = 300) {
    const expiry = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiry });
  }

  del(key) {
    this.store.delete(key);
  }

  delByPattern(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  clear() {
    this.store.clear();
  }
}

const memoryFallback = new MemoryCache();

const cacheService = {
  /**
   * Get cached value by key
   */
  async get(key) {
    try {
      if (isRedisAvailable()) {
        const client = getRedisClient();
        const data = await client.get(key);
        return data ? JSON.parse(data) : null;
      }
    } catch (err) {
      // Fallback on Redis read failure
    }
    return memoryFallback.get(key);
  },

  /**
   * Set cached key-value with TTL in seconds (default 5 minutes)
   */
  async set(key, value, ttlSeconds = 300) {
    try {
      if (isRedisAvailable()) {
        const client = getRedisClient();
        const serialized = JSON.stringify(value);
        await client.set(key, serialized, 'EX', ttlSeconds);
        return;
      }
    } catch (err) {
      // Fallback on Redis write failure
    }
    memoryFallback.set(key, value, ttlSeconds);
  },

  /**
   * Delete specific cache key
   */
  async del(key) {
    try {
      if (isRedisAvailable()) {
        const client = getRedisClient();
        await client.del(key);
      }
    } catch (err) {}
    memoryFallback.del(key);
  },

  /**
   * Invalidate multiple keys by pattern (e.g., 'user:profile:*')
   */
  async delByPattern(pattern) {
    try {
      if (isRedisAvailable()) {
        const client = getRedisClient();
        const keys = await client.keys(pattern);
        if (keys && keys.length > 0) {
          await client.del(...keys);
        }
      }
    } catch (err) {}
    memoryFallback.delByPattern(pattern);
  },

  /**
   * Read-through Cache Helper: Get from cache, or fetch from DB and store
   */
  async getOrSet(key, fetcherFn, ttlSeconds = 300) {
    const cached = await this.get(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const freshData = await fetcherFn();
    if (freshData !== null && freshData !== undefined) {
      await this.set(key, freshData, ttlSeconds);
    }
    return freshData;
  }
};

module.exports = cacheService;
