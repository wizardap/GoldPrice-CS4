const { createClient } = require('redis');

class CacheService {
    constructor() {
        // Khởi tạo Redis client
        this.client = createClient({
            url: `redis://${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || 6379}`,
            socket: {
                reconnectStrategy: (retries) => {
                    // Chiến lược kết nối lại với thời gian tăng dần
                    const delay = Math.min(retries * 100, 3000);
                    return delay;
                }
            }
        });

        this.ttl = 60; // 1 phút TTL (giây)
        this.keyPrefix = 'goldprice:';

        // Xử lý sự kiện
        this.client.on('error', (err) => {
            console.error('Redis connection error:', err);
        });

        this.client.on('connect', () => {
            console.log('Connected to Redis');
        });

        this.client.on('ready', () => {
            console.log('Redis client ready');
        });

        // Kết nối tới Redis
        this.connect();
    }

    // REPLACE: Improved connection method with better error handling
    async connect(retries = 5) {
        try {
            if (this.client.isOpen) {
                console.log('Redis connection already established');
                return;
            }

            await this.client.connect();
            console.log('Connected to Redis successfully');
        } catch (error) {
            console.error(`Failed to connect to Redis (attempts left: ${retries}):`, error);

            if (retries > 0) {
                console.log(`Retrying connection in 3 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                return this.connect(retries - 1);
            } else {
                console.error('Max retries reached. Could not connect to Redis');
                // Don't throw, allow the app to continue without Redis
            }
        }
    }

    async set(key, value) {
        try {
            const serialized = JSON.stringify(value);
            await this.client.setEx(`${this.keyPrefix}${key}`, this.ttl, serialized);
            return value;
        } catch (error) {
            console.error('Cache set error:', error);
            return value; // Vẫn trả về giá trị ngay cả khi cache lỗi
        }
    }

    async get(key) {
        try {
            const cached = await this.client.get(`${this.keyPrefix}${key}`);
            if (!cached) return null;

            return JSON.parse(cached);
        } catch (error) {
            console.error('Cache get error:', error);
            return null; // Lỗi cache sẽ kích hoạt tìm kiếm DB
        }
    }

    async invalidate(key) {
        try {
            await this.client.del(`${this.keyPrefix}${key}`);
        } catch (error) {
            console.error('Cache invalidation error:', error);
        }
    }

    // Thao tác nhóm để tăng hiệu suất
    async mget(keys) {
        try {
            const prefixedKeys = keys.map(key => `${this.keyPrefix}${key}`);
            const results = await this.client.mGet(prefixedKeys);

            return results.map(item => item ? JSON.parse(item) : null);
        } catch (error) {
            console.error('Cache mget error:', error);
            return keys.map(() => null);
        }
    }

    // ADD: Memory-efficient bulk operations
    async mset(items) {
        try {
            if (!items || !Array.isArray(items) || items.length === 0) return;

            const pipeline = this.client.pipeline();
            for (const { key, value } of items) {
                const serialized = JSON.stringify(value);
                pipeline.setEx(`${this.keyPrefix}${key}`, this.ttl, serialized);
            }

            await pipeline.exec();
            return true;
        } catch (error) {
            console.error('Cache mset error:', error);
            return false;
        }
    }

    // Kiểm tra trạng thái kết nối
    async ping() {
        try {
            return await this.client.ping();
        } catch (error) {
            console.error('Redis ping error:', error);
            return false;
        }
    }

    // ADD: Proper shutdown method
    async shutdown() {
        try {
            if (this.client && this.client.isOpen) {
                await this.client.quit();
                console.log('Redis connection closed gracefully');
            }
        } catch (error) {
            console.error('Error closing Redis connection:', error);
            // Force close if graceful quit fails
            if (this.client) {
                this.client.disconnect();
                console.log('Redis connection force closed');
            }
        }
    }

    // Thêm vào services/cacheService.js
    async startCleanupInterval() {
        // Không cần cleanup manual cho Redis vì đã có TTL
        console.log('Cache TTL is active, no manual cleanup needed');
    }
}

module.exports = new CacheService();