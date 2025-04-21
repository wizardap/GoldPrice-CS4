// Kafka service for publisher-subscriber pattern
const { Kafka } = require('kafkajs');
const kafkaConfig = require('../config/kafka');

class KafkaService {
    constructor() {
        this.kafka = new Kafka({
            clientId: kafkaConfig.clientId,
            brokers: kafkaConfig.brokers
        });
        this.producer = null;
        this.consumer = null;
        this.admin = null;
        this.topics = kafkaConfig.topics;
        this.connected = false;
    }

    async init() {
        try {
            // Khởi tạo admin client để quản lý topics
            this.admin = this.kafka.admin();
            await this.admin.connect();

            // Kiểm tra và tạo topic với số partitions cấu hình
            await this.ensureTopicExists(
                this.topics.goldPriceUpdates.name,
                this.topics.goldPriceUpdates.numPartitions,
                this.topics.goldPriceUpdates.replicationFactor
            );

            await this.admin.disconnect();
            console.log('Kafka topics initialized successfully');

            // Kết nối producer
            await this.connectProducer();

            return true;
        } catch (error) {
            console.error('Failed to initialize Kafka service:', error);
            return false;
        }
    }

    // Đảm bảo topic tồn tại với số partitions phù hợp
    async ensureTopicExists(topicName, numPartitions, replicationFactor) {
        try {
            const topics = await this.admin.listTopics();

            if (!topics.includes(topicName)) {
                await this.admin.createTopics({
                    topics: [
                        {
                            topic: topicName,
                            numPartitions: numPartitions,
                            replicationFactor: replicationFactor
                        }
                    ]
                });
                console.log(`Created Kafka topic "${topicName}" with ${numPartitions} partitions`);
            } else {
                // Kiểm tra số partitions hiện tại
                const topicMetadata = await this.admin.fetchTopicMetadata({ topics: [topicName] });
                const currentPartitions = topicMetadata.topics[0].partitions.length;

                if (currentPartitions < numPartitions) {
                    // Tăng số partitions nếu cần
                    await this.admin.createPartitions({
                        topicPartitions: [
                            {
                                topic: topicName,
                                count: numPartitions
                            }
                        ]
                    });
                    console.log(`Increased partitions for topic "${topicName}" from ${currentPartitions} to ${numPartitions}`);
                }
            }
        } catch (error) {
            console.error(`Error ensuring topic ${topicName} exists:`, error);
            throw error;
        }
    }

    async connectProducer() {
        try {
            this.producer = this.kafka.producer();
            await this.producer.connect();
            console.log('Kafka producer connected');
            this.connected = true;
            return true;
        } catch (error) {
            console.error('Failed to connect Kafka producer:', error);
            this.connected = false;
            return false;
        }
    }

    // Xác định partition key từ loại vàng để đảm bảo cùng loại vàng sẽ đi vào cùng partition
    determinePartition(goldType) {
        // Đơn giản: sử dụng hash function để đảm bảo cùng loại vàng luôn đi vào cùng partition
        const hash = goldType.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return hash % this.topics.goldPriceUpdates.numPartitions;
    }

    async publishGoldPriceUpdate(goldPrice) {
        if (!this.producer || !this.connected) {
            await this.connectProducer();
        }

        try {
            const goldType = goldPrice.type;
            // Xác định partition dựa trên goldType
            const partition = this.determinePartition(goldType);

            await this.producer.send({
                topic: this.topics.goldPriceUpdates.name,
                messages: [
                    {
                        partition, // Chỉ định partition cụ thể
                        key: goldType,
                        value: JSON.stringify({
                            type: goldType,
                            buy: goldPrice.buy,
                            sell: goldPrice.sell,
                            unit: goldPrice.unit,
                            timestamp: goldPrice.timestamp || new Date().toISOString()
                        })
                    }
                ]
            });
            return true;
        } catch (error) {
            console.error('Failed to publish gold price update:', error);
            return false;
        }
    }

    async subscribeToGoldPriceUpdates(groupId, callback) {
        try {
            this.consumer = this.kafka.consumer({ groupId });
            await this.consumer.connect();

            await this.consumer.subscribe({
                topic: this.topics.goldPriceUpdates.name,
                fromBeginning: false
            });

            await this.consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        console.log(`Received message from partition ${partition}`);
                        const goldPriceData = JSON.parse(message.value.toString());
                        callback(goldPriceData);
                    } catch (error) {
                        console.error('Error processing Kafka message:', error);
                    }
                }
            });

            console.log(`Kafka consumer subscribed to ${this.topics.goldPriceUpdates.name}`);
            return true;
        } catch (error) {
            console.error('Failed to subscribe to gold price updates:', error);
            return false;
        }
    }

    // Subscribe chỉ đến các loại vàng cụ thể 
    async subscribeToSpecificGoldTypes(groupId, goldTypes, callback) {
        try {
            const consumer = this.kafka.consumer({ groupId });
            await consumer.connect();

            await consumer.subscribe({
                topic: this.topics.goldPriceUpdates.name,
                fromBeginning: false
            });

            await consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        const goldPriceData = JSON.parse(message.value.toString());
                        // Chỉ xử lý các loại vàng đã đăng ký
                        if (goldTypes.includes(goldPriceData.type)) {
                            callback(goldPriceData);
                        }
                    } catch (error) {
                        console.error('Error processing Kafka message:', error);
                    }
                }
            });

            console.log(`Kafka consumer subscribed to specific gold types: ${goldTypes.join(', ')}`);
            return consumer; // Trả về consumer instance để có thể disconnect riêng
        } catch (error) {
            console.error('Failed to subscribe to specific gold types:', error);
            return null;
        }
    }

    async disconnect() {
        try {
            if (this.producer) {
                await this.producer.disconnect();
            }
            if (this.consumer) {
                await this.consumer.disconnect();
            }
            if (this.admin) {
                await this.admin.disconnect();
            }
            this.connected = false;
            console.log('Disconnected from Kafka');
        } catch (error) {
            console.error('Error disconnecting from Kafka:', error);
        }
    }
}

// Create a singleton instance
const kafkaService = new KafkaService();

module.exports = kafkaService;