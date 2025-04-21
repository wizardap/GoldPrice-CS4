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

// Khởi tạo producer với cấu hình tối ưu
const producer = kafka.producer({
  allowAutoTopicCreation: true,
  transactionTimeout: 30000,
  idempotent: config.kafka.producer.idempotent,
  compression: config.kafka.producer.compression,
  acks: config.kafka.producer.acks,
  // Cấu hình batching
  batchSize: config.kafka.producer.batchSize,
  lingerMs: config.kafka.producer.lingerMs
});

// Khởi tạo dead letter queue producer
const deadLetterProducer = kafka.producer({
  allowAutoTopicCreation: true,
  compression: config.kafka.producer.compression
});

// Khởi tạo consumer với cấu hình tối ưu
const consumer = kafka.consumer({
  groupId: `${config.kafka.clientId}-group`,
  sessionTimeout: config.kafka.consumer.sessionTimeout,
  heartbeatInterval: config.kafka.consumer.heartbeatInterval,
  maxWaitTimeInMs: config.kafka.consumer.maxWaitTimeInMs
});

// Array để lưu messages cho batch processing
let messageBuffer = [];
let bufferTimer = null;

/**
 * Flush buffer và gửi messages theo batch vào Kafka
 * @returns {Promise<void>}
 * @description Gửi tất cả messages đã được lưu trong buffer vào Kafka theo batch.
 * Nếu batch fails, thử gửi lại từng message riêng lẻ để tránh mất dữ liệu.
 */
const flushMessageBuffer = async () => {
  if (messageBuffer.length === 0) return;

  const messagesToSend = [...messageBuffer];
  messageBuffer = [];

  try {
    await producer.send({
      topic: config.kafka.topic,
      messages: messagesToSend
    });
    logger.info(`Batch of ${messagesToSend.length} messages published to Kafka`);
  } catch (error) {
    logger.error(`Error publishing batch messages: ${error.message}`);
    // Nếu batch fails, thử gửi từng message riêng lẻ để tránh mất dữ liệu
    for (const msg of messagesToSend) {
      try {
        await producerCircuitBreaker.exec({
          key: msg.key,
          value: JSON.parse(msg.value)
        });
      } catch (innerError) {
        logger.error(`Failed to send individual message: ${innerError.message}`);
      }
    }
  }
};

// Khởi tạo circuit breaker cho Kafka producer
const producerCircuitBreaker = new CircuitBreaker(
  /**
   * Hàm gửi message vào Kafka thông qua producer
   * @param {Object} message - Message cần gửi vào Kafka
   * @returns {Promise<Object>} - Kết quả từ Kafka producer
   */
  async (message) => {
    // Khi dùng circuit breaker, gửi message trực tiếp không qua buffer
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

/**
 * Gửi message vào Dead Letter Queue khi xử lý thất bại
 * @param {Object} message - Message gốc không thể xử lý được
 * @param {Error} error - Lỗi xảy ra khi xử lý message
 * @returns {Promise<boolean>} - Kết quả của quá trình gửi DLQ (true: thành công, false: thất bại)
 * @description Ghi lại message gốc, lỗi và timestamp vào Dead Letter Queue để xử lý sau
 */
const sendToDeadLetterQueue = async (message, error) => {
  try {
    await deadLetterProducer.send({
      topic: config.kafka.dlqTopic,
      messages: [
        {
          key: message.key,
          value: JSON.stringify({
            originalMessage: typeof message.value === 'string'
              ? message.value
              : JSON.stringify(message.value),
            error: error.message,
            timestamp: new Date().toISOString()
          })
        }
      ]
    });
    logger.info(`Message sent to DLQ: ${message.key}`);
    return true;
  } catch (dlqError) {
    logger.error(`Failed to send to DLQ: ${dlqError.message}`);
    return false;
  }
};

/**
 * Kết nối đến các thành phần Kafka (producer, consumer, DLQ producer)
 * @returns {Promise<boolean>} - Kết quả của quá trình kết nối (true: thành công, false: thất bại)
 * @description Thiết lập kết nối đến Kafka broker, khởi tạo producer và consumer
 * với cơ chế retry trong trường hợp kết nối thất bại ban đầu
 */
const connectKafka = async () => {
  return retryWithExponentialBackoff(async () => {
    try {
      await producer.connect();
      logger.info('Kafka producer connected');

      await deadLetterProducer.connect();
      logger.info('Kafka DLQ producer connected');

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

/**
 * Đẩy message vào Kafka topic, hỗ trợ batching và circuit breaker
 * @param {Object} message - Message cần publish, bao gồm key và value
 * @returns {Promise<boolean>} - Kết quả của quá trình publish (true: thành công, false: thất bại/circuit open)
 * @description Publish message vào Kafka topic với cơ chế batching nếu được cấu hình, hoặc
 * sử dụng circuit breaker để hạn chế lỗi cascade khi broker gặp vấn đề
 */
const publishMessage = async (message) => {
  try {
    // Nếu batching được bật (lingerMs > 0), thêm message vào buffer
    if (config.kafka.producer.lingerMs > 0) {
      messageBuffer.push({
        key: message.key || 'default',
        value: JSON.stringify(message)
      });

      // Nếu đạt đến kích thước batch hoặc chưa có timer, schedule flush
      if (messageBuffer.length >= config.kafka.producer.batchSize) {
        // Flush ngay lập tức nếu đạt kích thước batch
        await flushMessageBuffer();
      } else if (!bufferTimer) {
        // Thiết lập timer nếu chưa có
        bufferTimer = setTimeout(async () => {
          await flushMessageBuffer();
          bufferTimer = null;
        }, config.kafka.producer.lingerMs);
      }

      return true;
    } else {
      // Nếu không dùng batching, sử dụng circuit breaker trực tiếp
      const result = await producerCircuitBreaker.exec(message);
      logger.info(`Message published to topic ${config.kafka.topic}`, { keyID: message.key });
      return true;
    }
  } catch (error) {
    if (error.message.includes('Circuit kafka-producer is OPEN')) {
      logger.warn(`Kafka producer circuit is open. Skipping publish attempt.`);
      return false; // Trả về false, không retry khi circuit đã mở
    }

    logger.error(`Error publishing message to Kafka: ${error.message}`);
    throw error; // Ném lỗi để caller (controller) có thể retry nếu cần
  }
};

/**
 * Đăng ký consumer với handler function để xử lý message
 * @param {Function} messageHandler - Hàm xử lý message nhận được từ Kafka
 * @returns {Promise<boolean>} - Kết quả của quá trình đăng ký consumer (true: thành công, false: thất bại)
 * @description Khởi chạy Kafka consumer để lắng nghe và xử lý message từ topic đã đăng ký.
 * Hỗ trợ xử lý batch message để tối ưu hiệu năng và hạn chế số lần commit offset.
 */
const consumeMessages = async (messageHandler) => {
  try {
    await consumer.run({
      partitionsConsumedConcurrently: config.kafka.consumer.partitionsConsumedConcurrently,
      eachBatchAutoResolve: true,
      eachBatch: async ({
        batch,
        resolveOffset,
        heartbeat,
        isRunning,
        isStale
      }) => {
        for (let message of batch.messages) {
          if (!isRunning() || isStale()) break;

          try {
            const parsedMessage = JSON.parse(message.value.toString());
            logger.info(`Received message from topic ${batch.topic}`, {
              partition: batch.partition,
              key: message.key?.toString()
            });

            // Gọi handler để xử lý message
            await messageHandler(parsedMessage);
            resolveOffset(message.offset);
            await heartbeat();
          } catch (error) {
            logger.error(`Error processing Kafka message: ${error.message}`);
            // Gửi message lỗi đến DLQ
            await sendToDeadLetterQueue(message, error);
            // Vẫn resolveOffset để tiếp tục xử lý message tiếp theo
            resolveOffset(message.offset);
            await heartbeat();
          }
        }
      }
    });

    logger.info('Kafka consumer is running with optimized batch configuration');
    return true;
  } catch (error) {
    logger.error(`Error running Kafka consumer: ${error.message}`);
    return false;
  }
};

/**
 * Lấy thông tin metrics của Kafka để giám sát hệ thống
 * @returns {Promise<Object>} - Các metrics như topic offsets, consumer offsets, lag và buffer size
 * @description Thu thập các thông số metrics của Kafka như topic offsets, consumer offsets,
 * lag giữa producer và consumer, cũng như kích thước buffer hiện tại.
 */
const getKafkaMetrics = async () => {
  try {
    const admin = kafka.admin();
    await admin.connect();

    const topicOffsets = await admin.fetchTopicOffsets(config.kafka.topic);
    const consumerOffsets = await admin.fetchOffsets({
      groupId: `${config.kafka.clientId}-group`,
      topic: config.kafka.topic
    });

    // Tính toán lag cho mỗi partition
    const offsetLags = topicOffsets.map(topicOffset => {
      const partitionId = topicOffset.partition;
      const consumerOffset = consumerOffsets.find(c => c.partition === partitionId);

      return {
        partition: partitionId,
        topicOffset: parseInt(topicOffset.offset),
        consumerOffset: consumerOffset ? parseInt(consumerOffset.offset) : 0,
        lag: consumerOffset ? parseInt(topicOffset.offset) - parseInt(consumerOffset.offset) : parseInt(topicOffset.offset)
      };
    });

    await admin.disconnect();

    return {
      topicOffsets,
      consumerOffsets,
      offsetLags,
      bufferSize: messageBuffer.length
    };
  } catch (error) {
    logger.error(`Error fetching Kafka metrics: ${error.message}`);
    return { error: error.message };
  }
};

/**
 * Đóng kết nối đến Kafka một cách an toàn
 * @returns {Promise<boolean>} - Kết quả của quá trình đóng kết nối (true: thành công, false: thất bại)
 * @description Đóng kết nối với Kafka một cách an toàn, đảm bảo tất cả message trong buffer
 * được flush và các kết nối được dọn dẹp đúng cách
 */
const disconnectKafka = async () => {
  try {
    // Flush bất kỳ messages còn lại trong buffer
    if (messageBuffer.length > 0) {
      await flushMessageBuffer();
    }

    // Clear timer nếu có
    if (bufferTimer) {
      clearTimeout(bufferTimer);
      bufferTimer = null;
    }

    await producer.disconnect();
    await deadLetterProducer.disconnect();
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
  disconnectKafka,
  getKafkaMetrics
};