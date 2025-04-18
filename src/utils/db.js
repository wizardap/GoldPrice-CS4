const mongoose = require('mongoose');
const config = require('../config');
const logger = require('./logger');
const { CircuitBreaker } = require('./circuitBreaker');
const { retryWithExponentialBackoff } = require('./retry'); // <--- Thêm dòng này

// Kết nối MongoDB
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

// Đây là một trường hợp đặc biệt - Circuit Breaker cho DB query
// Chú ý: Nên được áp dụng cẩn thận để không ảnh hưởng dữ liệu quan trọng
const dbCircuitBreaker = new CircuitBreaker(
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