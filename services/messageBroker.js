const redis = require('redis');

class MessageBroker {
    constructor() {
        this.publisher = null;
        this.subscriber = null;
        this.subscriptions = new Map();
    }

    async connect() {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

        // Create publisher client
        this.publisher = redis.createClient({ url: redisUrl });
        await this.publisher.connect();

        // Create subscriber client
        this.subscriber = redis.createClient({ url: redisUrl });
        await this.subscriber.connect();

        // Set up error handlers
        this.publisher.on('error', err => console.error('Publisher Error:', err));
        this.subscriber.on('error', err => console.error('Subscriber Error:', err));

        console.log('Message Broker connected to Redis');
    }

    async publish(channel, message) {
        if (!this.publisher) {
            throw new Error('Message Broker not connected');
        }

        await this.publisher.publish(channel, JSON.stringify(message));
        console.log(`Published to ${channel}`);
    }

    async subscribe(channel, callback) {
        if (!this.subscriber) {
            throw new Error('Message Broker not connected');
        }

        await this.subscriber.subscribe(channel, (message) => {
            try {
                const data = JSON.parse(message);
                callback(data); // The data is already parsed here
            } catch (error) {
                console.error(`Error processing message from ${channel}:`, error);
            }
        });

        this.subscriptions.set(channel, callback);
        console.log(`Subscribed to ${channel}`);
    }

    async unsubscribe(channel) {
        if (this.subscriber && this.subscriptions.has(channel)) {
            await this.subscriber.unsubscribe(channel);
            this.subscriptions.delete(channel);
            console.log(`Unsubscribed from ${channel}`);
        }
    }

    async disconnect() {
        if (this.publisher) await this.publisher.quit();
        if (this.subscriber) await this.subscriber.quit();
        console.log('Message Broker disconnected');
    }
}

// Singleton instance
const messageBroker = new MessageBroker();
module.exports = messageBroker;