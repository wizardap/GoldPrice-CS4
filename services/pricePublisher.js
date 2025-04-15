const messageBroker = require('./messageBroker');

class PricePublisher {
    constructor() {
        this.initialized = false;
    }

    async init() {
        if (!this.initialized) {
            await messageBroker.connect();
            this.initialized = true;
        }
    }

    async publishPriceUpdate(seller, products) {
        if (!this.initialized) {
            await this.init();
        }

        const channel = `price:${seller}`;
        const message = {
            seller,
            products: products.map(product => ({
                ...product,
                updatedAt: new Date()
            })),
            timestamp: new Date()
        };

        await messageBroker.publish(channel, message);
        // Also publish to a general channel for clients that want all updates
        await messageBroker.publish('price:all', message);

        return true;
    }
}

module.exports = new PricePublisher();