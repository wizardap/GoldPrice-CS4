const dotenv = require('dotenv');

/**
 * Load environment variables từ file .env
 * @description Đọc các biến môi trường từ file .env vào process.env
 */
dotenv.config();

/**
 * Cấu hình ứng dụng
 * @description
 * Cấu hình tập trung cho toàn bộ ứng dụng, đọc từ biến môi trường hoặc sử dụng giá trị mặc định.
 * Tất cả các service và component đều sử dụng cấu hình từ file này để đảm bảo tính nhất quán
 * và dễ dàng thay đổi khi triển khai ở các môi trường khác nhau.
 */
module.exports = {
  /**
   * Cấu hình chung của ứng dụng
   * @property {number} port - Cổng HTTP server (mặc định: 8080)
   * @property {string} env - Môi trường chạy ứng dụng (development, production, test)
   */
  app: {
    port: process.env.PORT || 8080,
    env: process.env.NODE_ENV || 'development',
  },

  /**
   * Cấu hình kết nối MongoDB
   * @property {string} uri - Connection string để kết nối đến MongoDB
   * @property {Object} options - Các tùy chọn kết nối Mongoose
   */
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/goldprice',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },

  /**
   * Cấu hình Kafka message broker
   * @property {string[]} brokers - Danh sách các Kafka brokers
   * @property {string} clientId - ID của client khi kết nối đến Kafka
   * @property {string} topic - Topic chính để publish/subscribe messages
   * @property {string} dlqTopic - Dead Letter Queue topic cho messages xử lý lỗi
   * @property {Object} producer - Cấu hình cho Kafka producer
   * @property {Object} consumer - Cấu hình cho Kafka consumer
   */
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'gold-price-app',
    topic: process.env.KAFKA_TOPIC || 'gold-price-updates',
    dlqTopic: process.env.KAFKA_DLQ_TOPIC || 'gold-price-updates-dlq',
    producer: {
      batchSize: parseInt(process.env.KAFKA_BATCH_SIZE || 16384),
      lingerMs: parseInt(process.env.KAFKA_LINGER_MS || 5),
      compression: process.env.KAFKA_COMPRESSION || 'gzip',
      acks: parseInt(process.env.KAFKA_ACKS || -1), // -1: tất cả replicas phải acknowledge
      idempotent: process.env.KAFKA_IDEMPOTENT !== 'false'
    },
    consumer: {
      sessionTimeout: parseInt(process.env.KAFKA_SESSION_TIMEOUT || 30000),
      heartbeatInterval: parseInt(process.env.KAFKA_HEARTBEAT_INTERVAL || 3000),
      maxWaitTimeInMs: parseInt(process.env.KAFKA_MAX_WAIT_TIME || 500),
      maxBatchSize: parseInt(process.env.KAFKA_MAX_BATCH_SIZE || 500),
      partitionsConsumedConcurrently: parseInt(process.env.KAFKA_PARTITIONS_CONCURRENTLY || 3)
    }
  },

  /**
   * Cấu hình Redis cache
   * @property {string} host - Redis server host
   * @property {number} port - Redis server port
   * @property {string} password - Redis authentication password (nếu có)
   */
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || '',
  },

  /**
   * Cấu hình logging 
   * @property {string} level - Log level (error, warn, info, http, verbose, debug, silly)
   */
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  /**
   * Cấu hình cache
   * @property {number} ttl - Time-to-live mặc định cho các cache entries (seconds)
   */
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || 60) // seconds
  }
};