const Redis = require('ioredis');
require('dotenv').config();

let redisClient = null;
let isRedisConnected = false;

// Graceful Redis Connection Initializer
function initRedis() {
  const redisUrl = process.env.REDIS_URL;
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const password = process.env.REDIS_PASSWORD || undefined;

  try {
    if (redisUrl) {
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy: (times) => {
          if (times > 3) return null; // Stop reconnecting if not available
          return Math.min(times * 500, 2000);
        }
      });
    } else {
      redisClient = new Redis({
        host,
        port,
        password,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 500, 2000);
        }
      });
    }

    redisClient.on('connect', () => {
      isRedisConnected = true;
      console.log('✅ Redis Cache connected successfully.');
    });

    redisClient.on('ready', () => {
      isRedisConnected = true;
    });

    redisClient.on('error', (err) => {
      isRedisConnected = false;
      // Do not crash the server if Redis is down/optional in local dev
      // Log just once or suppress repetitive connection refused logs
      if (err.code === 'ECONNREFUSED') {
        // Suppress noisy stack trace
      } else {
        console.warn('⚠️ Redis notice:', err.message);
      }
    });

    redisClient.on('close', () => {
      isRedisConnected = false;
    });
  } catch (err) {
    console.warn('⚠️ Redis initialization fallback (using in-memory cache):', err.message);
    redisClient = null;
    isRedisConnected = false;
  }

  return redisClient;
}

// Initialize on module load
initRedis();

module.exports = {
  getRedisClient: () => redisClient,
  isRedisAvailable: () => isRedisConnected && redisClient?.status === 'ready'
};
