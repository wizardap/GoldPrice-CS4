// Redis cache service for gold prices
const { createClient } = require('redis');
const redisConfig = require('../config/redis');

class CacheService {
  constructor() {
    this.client = null;
    this.keyPrefix = redisConfig.keyPrefix;
    this.ttl = redisConfig.ttl;
    this.connected = false;
  }

  async connect() {
    try {
      this.client = createClient({
        url: `redis://${redisConfig.host}:${redisConfig.port}`
      });

      this.client.on('error', (err) => {
        console.error('Redis error:', err);
        this.connected = false;
      });

      this.client.on('connect', () => {
        console.log('Connected to Redis');
        this.connected = true;
      });

      await this.client.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.connected = false;
    }
  }

  async set(key, value) {
    if (!this.connected) return;
    
    try {
      const fullKey = `${this.keyPrefix}${key}`;
      await this.client.set(fullKey, JSON.stringify(value), {
        EX: this.ttl
      });
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }

  async get(key) {
    if (!this.connected) return null;
    
    try {
      const fullKey = `${this.keyPrefix}${key}`;
      const data = await this.client.get(fullKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.connected = false;
      console.log('Disconnected from Redis');
    }
  }
}

// Create a singleton instance
const cacheService = new CacheService();

module.exports = cacheService;