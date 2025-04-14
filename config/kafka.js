const { Kafka } = require('kafkajs');

// Create the Kafka client
const kafka = new Kafka({
    clientId: 'gold-price-app',
    brokers: ['kafka:9092'],
    retry: {
        initialRetryTime: 300,
        retries: 5
    }
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'gold-price-group' });
const admin = kafka.admin();

// Function to ensure required topics exist
async function ensureTopicsExist() {
    try {
        // Connect admin client if not already connected
        if (!admin.isConnected) {
            await admin.connect();
            console.log('Kafka admin connected');
        }

        // Define topics we need
        const topics = [
            { topic: 'gold-price-updates', numPartitions: 1, replicationFactor: 1 },
            { topic: 'gold-price-doji', numPartitions: 1, replicationFactor: 1 },
            { topic: 'gold-price-pnj', numPartitions: 1, replicationFactor: 1 },
            { topic: 'gold-price-sjc', numPartitions: 1, replicationFactor: 1 }
        ];

        try {
            await admin.createTopics({
                topics,
                timeout: 10000
            });
            console.log('Topics created successfully');
        } catch (error) {
            // Ignore "Topic already exists" errors
            if (!error.message.includes('already exists')) {
                throw error;
            }
            console.log('Some topics already exist, continuing...');
        }

        const availableTopics = await admin.listTopics();
        console.log('Available topics:', availableTopics);
        return availableTopics;
    } catch (error) {
        console.error('Error creating Kafka topics:', error);
        throw error;
    }
}

// Initialize Kafka connections
async function initKafka() {
    try {
        console.log('Initializing Kafka...');

        // Create topics first
        const availableTopics = await ensureTopicsExist();

        // Connect producer and consumer
        await producer.connect();
        console.log('Kafka producer connected');

        await consumer.connect();
        console.log('Kafka consumer connected');

        console.log('Kafka initialized successfully');
        return { producer, consumer, admin, availableTopics };
    } catch (error) {
        console.error('Failed to connect to Kafka:', error);
        throw error;
    }
}

module.exports = { producer, consumer, admin, initKafka, ensureTopicsExist };