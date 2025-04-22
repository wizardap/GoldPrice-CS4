// Gold Price Service for handling gold price operations
const { Sequelize } = require('sequelize');
const dbConfig = require('../config/database');
const cacheService = require('./cacheService');
const kafkaService = require('./kafkaService');

// Initialize database connection
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    define: dbConfig.define,
    // Thêm cấu hình pool
    pool: {
      max: 20,        // Tăng số lượng kết nối tối đa
      min: 5,         // Duy trì ít nhất 5 kết nối
      acquire: 30000, // 30 giây timeout khi tạo kết nối mới
      idle: 10000     // Kết nối không dùng sau 10 giây sẽ bị đóng
    },
    // Tối ưu hóa cho queries
    dialectOptions: {
      statement_timeout: 10000,        // 10 giây timeout cho câu query
      idle_in_transaction_session_timeout: 10000,  // Timeout cho transaction
      application_name: 'gold_price_app'
    }
  }
);

// Initialize models
const GoldPrice = require('../models/GoldPrice')(sequelize);

class GoldPriceService {
  constructor() {
    this.sequelize = sequelize;
    this.GoldPrice = GoldPrice;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      // Connect to database
      await this.sequelize.authenticate();
      console.log('Database connection established.');

      // Sync models with database
      await this.sequelize.sync();
      console.log('Database models synchronized.');

      // Initialize cache service
      await cacheService.connect();

      // Initialize Kafka producer
      await kafkaService.connectProducer();

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize GoldPriceService:', error);
      throw error;
    }
  }

  async updateGoldPrice(type, priceData) {
    try {
      // Validate inputs
      if (!type || !priceData || !priceData.buy || !priceData.sell) {
        throw new Error('Invalid gold price data');
      }

      // Tạo object chung chứa thông tin gold price
      const timestamp = priceData.updated_at ? new Date(priceData.updated_at) : new Date();
      const unit = priceData.unit || 'VND/lượng';

      // Tạo common data object
      const goldPriceCommon = {
        type,
        buy: priceData.buy,
        sell: priceData.sell,
        unit
      };

      // Object cho database
      const goldPriceData = {
        ...goldPriceCommon,
        timestamp
      };

      // Object cho cache và Kafka
      const goldPriceDto = {
        ...goldPriceCommon,
        updated_at: timestamp.toISOString()
      };

      // Chỉ đợi database operation hoàn thành - đây là thao tác quan trọng nhất
      await this.GoldPrice.upsert(goldPriceData);

      // Fire and forget: cache operation và kafka operation (không chặn response)
      cacheService.set(type, goldPriceDto)
        .catch(err => console.error('Cache update error:', err));

      kafkaService.publishGoldPriceUpdate({
        ...goldPriceDto,
        timestamp: goldPriceDto.updated_at  // Kafka sử dụng tên trường là timestamp
      }).catch(err => console.error('Kafka publish error:', err));

      // Trả về data cho client
      return goldPriceDto;
    } catch (error) {
      console.error(`Error updating gold price for ${type}:`, error);
      throw error;
    }
  }

  async getLatestGoldPrice(type) {
    try {
      // Try to get from cache first
      const cachedData = await cacheService.get(type);
      if (cachedData) {
        return cachedData;
      }

      // If not in cache, get from database
      const latestPrice = await this.GoldPrice.findOne({
        where: { type },
        order: [['timestamp', 'DESC']]
      });

      if (!latestPrice) {
        return null;
      }

      const result = {
        buy: latestPrice.buy,
        sell: latestPrice.sell,
        unit: latestPrice.unit,
        updated_at: latestPrice.timestamp.toISOString()
      };

      // Update cache
      await cacheService.set(type, result);

      return result;
    } catch (error) {
      console.error(`Error getting latest gold price for ${type}:`, error);
      throw error;
    }
  }

  async close() {
    try {
      await cacheService.disconnect();
      await kafkaService.disconnect();
      await this.sequelize.close();
      console.log('GoldPriceService closed');
    } catch (error) {
      console.error('Error closing GoldPriceService:', error);
    }
  }
}

// Create a singleton instance
const goldPriceService = new GoldPriceService();

module.exports = goldPriceService;