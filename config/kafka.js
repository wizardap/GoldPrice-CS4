const { Kafka } = require('kafkajs');

const kafka = new Kafka({
    clientId: 'gold-price-app',
    brokers: ['kafka:9092']
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'gold-price-group' });

const initKafka = async () => {
    await producer.connect();
    await consumer.connect();
    await consumer.subscribe({ topic: 'gold-price-updates', fromBeginning: true });
    console.log('Kafka Connected');
};

module.exports = { producer, consumer, initKafka };