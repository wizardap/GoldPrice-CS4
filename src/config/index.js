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