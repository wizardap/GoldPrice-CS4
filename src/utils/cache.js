const { createClient } = require('redis');
const config = require('../config');
const logger = require('./logger');
const { retryWithExponentialBackoff } = require('./retry');
const { CircuitBreaker } = require('./circuitBreaker');

// Khởi tạo client Redis
const client = createClient({
  url: `redis://${config.redis.password ? config.redis.password + '@' : ''}${config.redis.host}:${config.redis.port}`
});

client.on('error', (err) => {
  logger.error(`Redis client error: ${err}`);
});

client.on('connect', () => {
  logger.info('Redis client connected');
});

// Kết nối Redis
const connectRedis = async () => {
  return retryWithExponentialBackoff(
    async () => {
      try {
        await client.connect();
        logger.info('Redis connected successfully');
        return true;
      } catch (error) {
        logger.error(`Redis connection error: ${error.message}`);
        throw error; // Rethrow để retry mechanism xử lý
      }
    },
    5,    // 5 lần thử
    1000  // Delay ban đầu 1 giây
  ).catch(error => {
    logger.warn(`Failed to connect to Redis after retries: ${error.message}`);
    // Không exit process vì Redis chỉ là cache, ứng dụng vẫn có thể hoạt động
    return false;
  });
};

// Tạo Circuit Breaker cho Redis operations
const redisCircuitBreaker = new CircuitBreaker(
  async (operation, ...args) => {
    return await operation(...args);
  },
  {
    name: 'redis-cache',
    failureThreshold: 3,
    resetTimeout: 5000,
    successThreshold: 1,
    logger: logger
  }
);

// Cập nhật setCache với Circuit Breaker và Retry
const setCache = async (key, value, ttl = config.cache.ttl) => {
  return retryWithExponentialBackoff(async () => {
    try {
      await redisCircuitBreaker.exec(
        async (k, v, t) => await client.set(k, JSON.stringify(v), { EX: t }),
        key, value, ttl
      );
      return true;
    } catch (error) {
      if (error.message.includes('Circuit redis-cache is OPEN')) {
        logger.warn(`Redis circuit is open. Skipping cache operation.`);
        return false; // Không retry khi circuit đã mở
      }
      logger.error(`Redis set error: ${error.message}`);
      throw error; // Cho phép retry nếu không phải do circuit mở
    }
  }, 2, 500);
};

// Tương tự cho getCache
const getCache = async (key) => {
  try {
    return await redisCircuitBreaker.exec(
      async (k) => {
        const data = await client.get(k);
        return data ? JSON.parse(data) : null;
      },
      key
    );
  } catch (error) {
    logger.error(`Redis get error: ${error.message}`);
    return null; // Trả về null khi cache thất bại, cho phép fallback sang DB
  }
};

// Xóa cache
const deleteCache = async (key) => {
  try {
    await client.del(key);
    return true;
  } catch (error) {
    logger.error(`Redis delete error: ${error.message}`);
    return false;
  }
};

// Xóa cache theo pattern
const deleteCachePattern = async (pattern) => {
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
    return true;
  } catch (error) {
    logger.error(`Redis delete pattern error: ${error.message}`);
    return false;
  }
};

module.exports = {
  connectRedis,
  setCache,
  getCache,
  deleteCache,
  deleteCachePattern,
  client
};