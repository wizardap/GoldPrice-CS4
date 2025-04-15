const messageBroker = require('./messageBroker');

class PriceSubscriber {
    constructor() {
        this.initialized = false;
        this.callbacks = new Map();
    }

    async init() {
        if (!this.initialized) {
            await messageBroker.connect();
            this.initialized = true;
        }
    }

    async subscribeToSeller(seller, callback) {
        if (!this.initialized) {
            await this.init();
        }

        const channel = `price:${seller}`;

        // Store callback for management
        if (!this.callbacks.has(channel)) {
            this.callbacks.set(channel, []);
        }
        this.callbacks.get(channel).push(callback);

        // Subscribe through the message broker
        await messageBroker.subscribe(channel, (message) => {
            try {
                // No need to parse again, just use the message directly
                callback(message);
            } catch (error) {
                console.error('Error handling price update:', error);
            }
        });

        return () => this.unsubscribeFromSeller(seller, callback);
    }

    async subscribeToAllSellers(callback) {
        if (!this.initialized) {
            await this.init();
        }

        const channel = 'price:all';

        // Store callback for management
        if (!this.callbacks.has(channel)) {
            this.callbacks.set(channel, []);
        }
        this.callbacks.get(channel).push(callback);

        // Subscribe through the message broker
        await messageBroker.subscribe(channel, (message) => {
            try {
                // No need to parse again, just use the message directly
                callback(message);
            } catch (error) {
                console.error('Error handling price update:', error);
            }
        });

        return () => this.unsubscribeFromAllSellers(callback);
    }

    async unsubscribeFromSeller(seller, callback) {
        const channel = `price:${seller}`;
        if (this.callbacks.has(channel)) {
            const callbacks = this.callbacks.get(channel);
            const index = callbacks.indexOf(callback);

            if (index !== -1) {
                callbacks.splice(index, 1);

                // If no more callbacks for this channel, unsubscribe
                if (callbacks.length === 0) {
                    await messageBroker.unsubscribe(channel);
                    this.callbacks.delete(channel);
                }
            }
        }
    }

    async unsubscribeFromAllSellers(callback) {
        const channel = 'price:all';
        if (this.callbacks.has(channel)) {
            const callbacks = this.callbacks.get(channel);
            const index = callbacks.indexOf(callback);

            if (index !== -1) {
                callbacks.splice(index, 1);

                // If no more callbacks for this channel, unsubscribe
                if (callbacks.length === 0) {
                    await messageBroker.unsubscribe(channel);
                    this.callbacks.delete(channel);
                }
            }
        }
    }
}

module.exports = new PriceSubscriber();