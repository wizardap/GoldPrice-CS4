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

      // 1. Sửa đổi: Thực hiện song song các thao tác
      const [dbOperation, cacheOperation] = await Promise.all([
        // Database operation - hàm này trả về Promise
        (async () => {
          const goldPriceData = {
            type,
            buy: priceData.buy,
            sell: priceData.sell,
            unit: priceData.unit || 'VND/lượng',
            timestamp: priceData.updated_at ? new Date(priceData.updated_at) : new Date()
          };

          // Sử dụng upsert thay vì findOrCreate
          return this.GoldPrice.upsert(goldPriceData);
        })(),

        // Cache operation
        cacheService.set(type, {
          buy: priceData.buy,
          sell: priceData.sell,
          unit: priceData.unit || 'VND/lượng',
          updated_at: priceData.updated_at || new Date().toISOString()
        })
      ]);

      // Kafka operation không blocking request
      kafkaService.publishGoldPriceUpdate({
        type,
        buy: priceData.buy,
        sell: priceData.sell,
        unit: priceData.unit || 'VND/lượng',
        timestamp: priceData.updated_at || new Date().toISOString()
      }).catch(err => console.error('Kafka publish error:', err));

      return {
        type,
        buy: priceData.buy,
        sell: priceData.sell,
        unit: priceData.unit || 'VND/lượng',
        updated_at: priceData.updated_at || new Date().toISOString()
      };
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

  async getGoldPriceHistory(type, startTime, endTime, limit = 100) {
    try {
      const query = { where: { type } };

      if (startTime && endTime) {
        query.where.timestamp = {
          [Sequelize.Op.between]: [new Date(startTime), new Date(endTime)]
        };
      } else if (startTime) {
        query.where.timestamp = {
          [Sequelize.Op.gte]: new Date(startTime)
        };
      } else if (endTime) {
        query.where.timestamp = {
          [Sequelize.Op.lte]: new Date(endTime)
        };
      }

      query.order = [['timestamp', 'DESC']];
      query.limit = limit;

      const prices = await this.GoldPrice.findAll(query);

      return prices.map(price => ({
        type: price.type,
        buy: price.buy,
        sell: price.sell,
        unit: price.unit,
        updated_at: price.timestamp.toISOString()
      }));
    } catch (error) {
      console.error(`Error getting gold price history for ${type}:`, error);
      throw error;
    }
  }

  async getAllGoldTypes() {
    try {
      const types = await this.GoldPrice.findAll({
        attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('type')), 'type']]
      });

      return types.map(t => t.type);
    } catch (error) {
      console.error('Error getting all gold types:', error);
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