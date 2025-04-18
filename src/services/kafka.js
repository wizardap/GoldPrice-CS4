const { Kafka } = require('kafkajs');
const config = require('../config');
const logger = require('../utils/logger');
const { retryWithExponentialBackoff } = require('../utils/retry');
const { CircuitBreaker } = require('../utils/circuitBreaker');

// Khởi tạo Kafka client
const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers
});

// Khởi tạo producer
const producer = kafka.producer();

// Khởi tạo consumer
const consumer = kafka.consumer({ groupId: `${config.kafka.clientId}-group` });

// Khởi tạo circuit breaker cho Kafka producer
const producerCircuitBreaker = new CircuitBreaker(
  async (message) => {
    return await producer.send({
      topic: config.kafka.topic,
      messages: [
        {
          key: message.key || 'default',
          value: JSON.stringify(message)
        }
      ],
    });
  },
  {
    name: 'kafka-producer',
    failureThreshold: 3,        // Mở circuit sau 3 lỗi liên tiếp
    resetTimeout: 10000,        // Thử lại sau 10 giây
    successThreshold: 2,        // Cần 2 lần thành công để đóng lại circuit
    logger: logger
  }
);

// Kết nối Kafka
const connectKafka = async () => {
  return retryWithExponentialBackoff(async () => {
    try {
      await producer.connect();
      logger.info('Kafka producer connected');

      await consumer.connect();
      logger.info('Kafka consumer connected');

      // Subscribe đến topic
      await consumer.subscribe({
        topic: config.kafka.topic,
        fromBeginning: false
      });

      logger.info(`Kafka consumer subscribed to topic: ${config.kafka.topic}`);

      return true;
    } catch (error) {
      logger.error(`Kafka connection error: ${error.message}`);
      return false;
    }
  },
    3,
    2000
  );

};

// Publish message vào Kafka topic - SỬA LẠI
const publishMessage = async (message) => {
  try {
    // Không bọc bằng retry - sẽ để retry ở một nơi duy nhất
    const result = await producerCircuitBreaker.exec(message);
    logger.info(`Message published to topic ${config.kafka.topic}`, { keyID: message.key });
    return true;
  } catch (error) {
    if (error.message.includes('Circuit kafka-producer is OPEN')) {
      logger.warn(`Kafka producer circuit is open. Skipping publish attempt.`);
      return false; // Trả về false, không retry khi circuit đã mở
    }

    logger.error(`Error publishing message to Kafka: ${error.message}`);
    throw error; // Ném lỗi để caller (controller) có thể retry nếu cần
  }
};

// Đăng ký consumer với handler function
const consumeMessages = async (messageHandler) => {
  try {
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const parsedMessage = JSON.parse(message.value.toString());
          logger.info(`Received message from topic ${topic}`, { partition, key: message.key?.toString() });

          // Gọi handler để xử lý message
          await messageHandler(parsedMessage);
        } catch (error) {
          logger.error(`Error processing Kafka message: ${error.message}`);
        }
      },
    });

    logger.info('Kafka consumer is running');
    return true;
  } catch (error) {
    logger.error(`Error running Kafka consumer: ${error.message}`);
    return false;
  }
};

// Đóng kết nối Kafka
const disconnectKafka = async () => {
  try {
    await producer.disconnect();
    await consumer.disconnect();
    logger.info('Kafka connections closed');
    return true;
  } catch (error) {
    logger.error(`Error disconnecting from Kafka: ${error.message}`);
    return false;
  }
};

module.exports = {
  connectKafka,
  publishMessage,
  consumeMessages,
  disconnectKafka
};