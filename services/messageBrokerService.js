const { producer, consumer } = require('../config/kafka');
const metricsService = require('./metricsService');

class MessageBrokerService {
    constructor() {
        this.topicPrefix = 'gold-price';
        this.mainTopic = 'gold-price-updates';
        this.eventTypes = {
            PRICE_UPDATED: 'PRICE_UPDATED',
            PRICE_REQUESTED: 'PRICE_REQUESTED',
            NEW_BRAND_ADDED: 'NEW_BRAND_ADDED',
            SYSTEM_ALERT: 'SYSTEM_ALERT'
        };
        this.eventListeners = {};
        this.isConnected = false;
        this.socketCallback = null; // For backward compatibility
    }

    // Register event handlers with types
    on(eventType, callback) {
        if (!this.eventListeners[eventType]) {
            this.eventListeners[eventType] = [];
        }
        this.eventListeners[eventType].push(callback);
        return this; // For chaining
    }

    // Function to publish gold price events
    async publishMessage(message) {
        try {
            // Connect producer if not connected
            if (!this.isConnected) {
                await producer.connect();
                this.isConnected = true;
            }

            const keyID = message.keyID.toLowerCase();
            const brandTopic = `${this.topicPrefix}-${keyID}`;

            // Ensure event has type if it's an event object
            const eventMessage = {
                ...message,
                eventType: message.eventType || this.eventTypes.PRICE_UPDATED,
                timestamp: message.timestamp || new Date()
            };

            // Create the message
            const kafkaMessage = {
                value: JSON.stringify(eventMessage),
                key: keyID
            };

            // Send to main topic
            await producer.send({
                topic: this.mainTopic,
                messages: [kafkaMessage]
            });

            // Send to brand-specific topic
            await producer.send({
                topic: brandTopic,
                messages: [kafkaMessage]
            });

            console.log(`Event ${eventMessage.eventType} published for ${keyID}`);
            metricsService.incrementKafkaPublished();
            return true;
        } catch (error) {
            console.error(`Failed to publish message: ${error.message}`);
            return false;
        }
    }

    // Function to subscribe to gold price events
    async subscribeToMessages() {
        try {
            // Subscribe to the main topic
            await consumer.subscribe({ topic: this.mainTopic, fromBeginning: false });

            // Subscribe to individual brand topics
            const brands = ['doji', 'pnj', 'sjc'];
            for (const brand of brands) {
                try {
                    await consumer.subscribe({
                        topic: `${this.topicPrefix}-${brand}`,
                        fromBeginning: false
                    });
                } catch (error) {
                    console.warn(`Could not subscribe to ${brand} topic: ${error.message}`);
                }
            }

            // Process incoming messages
            await consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        const parsedMessage = JSON.parse(message.value.toString());
                        const eventType = parsedMessage.eventType || this.eventTypes.PRICE_UPDATED;

                        // Process the event internally
                        this._processEvent(parsedMessage, eventType);

                        metricsService.incrementKafkaConsumed();
                    } catch (error) {
                        console.error(`Error processing message: ${error.message}`);
                    }
                }
            });

            console.log('Message consumer started successfully');
        } catch (error) {
            console.error(`Failed to subscribe to messages: ${error.message}`);
            throw error;
        }
    }

    // Process events internally
    _processEvent(event, eventType) {
        // Process specific event type handlers
        if (this.eventListeners[eventType]) {
            this.eventListeners[eventType].forEach(callback => {
                try {
                    callback(event);
                } catch (error) {
                    console.error(`Error in event handler for ${eventType}:`, error);
                }
            });
        }

        // Process wildcard handlers that listen to all events
        if (this.eventListeners['*']) {
            this.eventListeners['*'].forEach(callback => {
                try {
                    callback(event, eventType);
                } catch (error) {
                    console.error(`Error in wildcard event handler:`, error);
                }
            });
        }

        // For backwards compatibility with the old approach
        if (this.socketCallback) {
            this.socketCallback(event);
        }
    }

    // For backward compatibility with existing socket service
    registerSocketCallback(callback) {
        this.socketCallback = callback;
        return this;
    }

    async shutdown() {
        try {
            if (this.isConnected) {
                await producer.disconnect();
                await consumer.disconnect();
                this.isConnected = false;
                console.log('Message broker connections closed');
            }
        } catch (error) {
            console.error('Error shutting down message broker:', error);
        }
    }
}

module.exports = new MessageBrokerService();