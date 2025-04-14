const GoldPrice = require('../models/GoldPrice');
const cacheService = require('../services/cacheService');
const metricsService = require('../services/metricsService');

class GoldPriceRepository {
    async save(key, data) {
        try {
            const startTime = Date.now();

            const result = await GoldPrice.findOneAndUpdate(
                { keyID: key },
                {
                    items: data.items, // Thay đổi từ brands sang items
                    timestamp: new Date()
                },
                { upsert: true, new: true }
            );

            metricsService.recordDbQuery(Date.now() - startTime);

            // Update cache
            await cacheService.set(key, result);

            return result._id;
        } catch (error) {
            throw new Error(`Failed to save gold price: ${error.message}`);
        }
    }

    async findByKey(key) {
        try {
            // Try to get from cache first
            const cachedResult = await cacheService.get(key);
            if (cachedResult) {
                return cachedResult;
            }

            // If not in cache, query database
            const startTime = Date.now();
            const result = await GoldPrice.findOne({ keyID: key });
            metricsService.recordDbQuery(Date.now() - startTime);

            // Store in cache if found
            if (result) {
                await cacheService.set(key, result);
            }

            return result;
        } catch (error) {
            throw new Error(`Failed to find gold price: ${error.message}`);
        }
    }

    // Thêm method để lấy tất cả các hãng
    async findAll() {
        try {
            const startTime = Date.now();
            const results = await GoldPrice.find({}).sort({ keyID: 1 });
            metricsService.recordDbQuery(Date.now() - startTime);
            return results;
        } catch (error) {
            throw new Error(`Failed to find all gold prices: ${error.message}`);
        }
    }

    // ADD: Batch operations for better performance
    async saveBatch(items) {
        try {
            const operations = items.map(item => ({
                updateOne: {
                    filter: { keyID: item.key },
                    update: {
                        items: item.data.items,
                        timestamp: new Date()
                    },
                    upsert: true
                }
            }));

            const startTime = Date.now();
            const result = await GoldPrice.bulkWrite(operations);
            metricsService.recordDbQuery(Date.now() - startTime);

            // Update cache in bulk
            const cacheItems = items.map(item => ({
                key: item.key,
                value: {
                    keyID: item.key,
                    items: item.data.items,
                    timestamp: new Date()
                }
            }));
            await cacheService.mset(cacheItems);

            return result;
        } catch (error) {
            throw new Error(`Failed to batch save gold prices: ${error.message}`);
        }
    }
}

module.exports = new GoldPriceRepository();