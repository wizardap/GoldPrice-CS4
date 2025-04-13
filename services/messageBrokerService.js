const { producer, consumer } = require('../config/kafka');

class MessageBrokerService {
    constructor() {
        this.topic = 'gold-price-updates';
    }

    async publishMessage(message) {
        try {
            await producer.send({
                topic: this.topic,
                messages: [{ value: JSON.stringify(message) }]
            });
        } catch (error) {
            throw new Error(`Failed to publish message: ${error.message}`);
        }
    }

    async subscribeToMessages(callback) {
        try {
            await consumer.subscribe({ topic: this.topic, fromBeginning: true });
            await consumer.run({
                eachMessage: async ({ message }) => {
                    const parsedMessage = JSON.parse(message.value);
                    callback(parsedMessage);
                }
            });
        } catch (error) {
            throw new Error(`Failed to subscribe to messages: ${error.message}`);
        }
    }
}

module.exports = new MessageBrokerService();