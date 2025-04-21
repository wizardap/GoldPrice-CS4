// Kafka configuration for pub-sub system
require('dotenv').config();

module.exports = {
    clientId: 'gold-price-client',
    brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
    topics: {
        goldPriceUpdates: {
            name: 'gold-price-updates',
            numPartitions: 6,      // Tăng số lượng partitions
            replicationFactor: 1   // Giữ nguyên cho dev
        }
    }
};