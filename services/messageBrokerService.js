const { producer, consumer } = require('../config/kafka');

class MessageBrokerService {
    constructor() {
        this.topicPrefix = 'gold-price';
        this.mainTopic = 'gold-price-updates';
        this.listeners = [];
        this.isConnected = false;
    }

    // Function to publish gold price updates
    async publishMessage(message) {
        try {
            // Connect producer if not connected
            if (!this.isConnected) {
                await producer.connect();
                this.isConnected = true;
            }

            const keyID = message.keyID.toLowerCase();
            const brandTopic = `${this.topicPrefix}-${keyID}`;

            console.log(`Publishing to topics: ${this.mainTopic} and ${brandTopic}`);

            // Create the message
            const kafkaMessage = {
                value: JSON.stringify(message),
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

            console.log(`Message published for ${keyID}`);
            return true;
        } catch (error) {
            console.error(`Failed to publish message: ${error.message}`);
            return false;
        }
    }

    // Function to subscribe to gold price updates
    async subscribeToMessages(callback) {
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
                        await callback(parsedMessage);
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
}

module.exports = new MessageBrokerService();