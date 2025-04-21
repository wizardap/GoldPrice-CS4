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

/**
 * Kết nối đến Redis server với cơ chế retry
 * @returns {Promise<boolean>} - Kết quả của quá trình kết nối (true: thành công, false: thất bại)
 * @description 
 * Thiết lập kết nối đến Redis server với cơ chế retry theo exponential backoff.
 * Nếu kết nối thất bại sau số lần retry tối đa, ứng dụng vẫn tiếp tục chạy
 * và sẽ fallback sang database cho các thao tác đọc/ghi.
 */
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
  /**
   * Thực thi operation Redis với các tham số
   * @param {Function} operation - Operation Redis cần thực thi
   * @param {...any} args - Các tham số cho operation
   * @returns {Promise<any>} - Kết quả của operation
   */
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

/**
 * Lưu dữ liệu vào Redis cache với cơ chế circuit breaker và retry
 * @param {string} key - Cache key 
 * @param {any} value - Giá trị cần cache (sẽ được chuyển thành JSON)
 * @param {number} ttl - Time-to-live (seconds), mặc định lấy từ config
 * @returns {Promise<boolean>} - Kết quả của thao tác cache (true: thành công, false: thất bại)
 * @description
 * Lưu dữ liệu vào Redis với cơ chế circuit breaker để tránh lỗi cascade
 * và retry khi gặp lỗi tạm thời. Giá trị được serialize thành JSON trước khi lưu.
 */
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

/**
 * Lấy dữ liệu từ Redis cache với cơ chế circuit breaker
 * @param {string} key - Cache key cần truy vấn
 * @returns {Promise<any|null>} - Giá trị đã được parse từ JSON hoặc null nếu không tìm thấy/lỗi
 * @description
 * Lấy dữ liệu từ Redis với circuit breaker để tránh lỗi cascade.
 * Kết quả được parse từ JSON thành JavaScript object trước khi trả về.
 * Trả về null khi có lỗi để caller có thể fallback sang database.
 */
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

/**
 * Xóa một key trong Redis cache
 * @param {string} key - Cache key cần xóa
 * @returns {Promise<boolean>} - Kết quả của thao tác xóa (true: thành công, false: thất bại)
 * @description Xóa một key cụ thể từ Redis cache
 */
const deleteCache = async (key) => {
  try {
    await client.del(key);
    return true;
  } catch (error) {
    logger.error(`Redis delete error: ${error.message}`);
    return false;
  }
};

/**
 * Xóa nhiều keys theo pattern trong Redis cache
 * @param {string} pattern - Pattern của các keys cần xóa (ví dụ: "user:*")
 * @returns {Promise<boolean>} - Kết quả của thao tác xóa (true: thành công, false: thất bại)
 * @description 
 * Tìm và xóa tất cả các keys khớp với pattern.
 * Hữu ích khi cần invalidate một nhóm cache liên quan (ví dụ: tất cả cache của một vendor)
 */
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