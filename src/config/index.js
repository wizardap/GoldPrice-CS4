const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Cấu hình ứng dụng
module.exports = {
  app: {
    port: process.env.PORT || 8080,
    env: process.env.NODE_ENV || 'development',
  },

  // Cấu hình MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/goldprice',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },

  // Cấu hình Kafka
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

  // Cấu hình Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || '',
  },

  // Cấu hình Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Cấu hình Cache
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || 60) // seconds
  }
};