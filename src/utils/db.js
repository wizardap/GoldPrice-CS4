const mongoose = require('mongoose');
const config = require('../config');
const logger = require('./logger');
const { CircuitBreaker } = require('./circuitBreaker');
const { retryWithExponentialBackoff } = require('./retry');

/**
 * Thiết lập kết nối đến MongoDB với cơ chế retry
 * @returns {Promise<boolean>} - Kết quả của quá trình kết nối (true: thành công)
 * @description 
 * Kết nối đến MongoDB với cơ chế retry theo exponential backoff.
 * Cấu hình Mongoose với các tham số tối ưu cho reconnect tự động.
 * Thêm các event handler để xử lý các trường hợp disconnected và reconnected.
 * Nếu kết nối thất bại sau số lần retry tối đa, ứng dụng sẽ thoát vì đây là thành phần quan trọng.
 */
const connectDB = async () => {
  return retryWithExponentialBackoff(
    async () => {
      try {
        await mongoose.connect(config.mongodb.uri, {
          ...config.mongodb.options,
          // Cấu hình reconnect của Mongoose
          serverSelectionTimeoutMS: 10000, // 10 giây timeout cho quá trình server selection
          heartbeatFrequencyMS: 30000,     // Kiểm tra server mỗi 30 giây
        });

        // Xử lý mất kết nối trong quá trình hoạt động
        mongoose.connection.on('disconnected', () => {
          logger.warn('MongoDB disconnected, attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
          logger.info('MongoDB reconnected successfully');
        });

        logger.info('MongoDB connected successfully');
        return true;
      } catch (error) {
        logger.error(`MongoDB connection error: ${error.message}`);
        throw error; // Rethrow để retry mechanism xử lý
      }
    },
    5,    // 5 lần thử
    2000  // Delay ban đầu 2 giây
  ).catch(error => {
    logger.error(`Failed to connect to MongoDB after retries: ${error.message}`);
    process.exit(1);
  });
};

/**
 * Circuit Breaker được cấu hình riêng cho các thao tác truy vấn MongoDB
 * @description
 * Circuit breaker dành riêng cho các thao tác truy vấn database, với ngưỡng 
 * lỗi cao hơn các circuit breaker khác vì database là thành phần quan trọng.
 * Được thiết kế để bảo vệ MongoDB khỏi quá tải khi xảy ra sự cố, 
 * nhưng vẫn đảm bảo dịch vụ có thể phục hồi nhanh chóng.
 */
const dbCircuitBreaker = new CircuitBreaker(
  /**
   * Thực thi một database operation với các tham số truyền vào
   * @param {Function} operation - Database operation cần thực thi (thường là một query method)
   * @param {...any} args - Các tham số cho operation
   * @returns {Promise<any>} - Kết quả của database operation
   */
  async (operation, ...args) => await operation(...args),
  {
    name: 'mongodb-queries',
    failureThreshold: 5,        // Cao hơn vì DB là thành phần quan trọng
    resetTimeout: 15000,
    successThreshold: 2,
    logger: logger
  }
);

// Export để các model sử dụng
module.exports = {
  connectDB,
  dbCircuitBreaker
};