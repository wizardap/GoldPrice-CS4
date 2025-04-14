const { Kafka } = require('kafkajs');

async function testKafka() {
    const kafka = new Kafka({
        clientId: 'kafka-test-client',
        brokers: ['kafka:9092']
    });

    const admin = kafka.admin();
    const producer = kafka.producer();

    try {
        console.log('Connecting to Kafka admin...');
        await admin.connect();
        
        console.log('Listing topics...');
        const topics = await admin.listTopics();
        console.log('Available topics:', topics);

        console.log('Connecting producer...');
        await producer.connect();

        const testTopic = 'test-topic';
        
        console.log(`Creating test topic: ${testTopic}`);
        await admin.createTopics({
            topics: [{ topic: testTopic, numPartitions: 1, replicationFactor: 1 }]
        });
        
        console.log(`Sending test message to ${testTopic}`);
        await producer.send({
            topic: testTopic,
            messages: [{ value: 'Test message' }]
        });
        
        console.log('Test message sent successfully');
        
        console.log('Kafka is working properly!');
    } catch (error) {
        console.error('Kafka test failed:', error);
    } finally {
        await admin.disconnect();
        await producer.disconnect();
    }
}

// Run the test if executed directly
if (require.main === module) {
    testKafka().catch(console.error);
}

module.exports = { testKafka };