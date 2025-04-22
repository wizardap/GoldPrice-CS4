// Redis configuration for caching
require('dotenv').config();

module.exports = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    ttl: 20, // Cache TTL in seconds
    keyPrefix: 'goldprice:'
};