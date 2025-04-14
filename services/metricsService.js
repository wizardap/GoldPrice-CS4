class MetricsService {
    constructor() {
        this.metrics = {
            requestCount: 0,
            responseTimeTotal: 0,
            errorCount: 0,
            socketConnections: 0,
            kafkaPublished: 0,
            kafkaConsumed: 0,
            dbQueries: 0,
            dbQueryTime: 0
        };

        // Initialize stats collection
        setInterval(() => {
            this.logMetrics();
        }, 60000); // Log every minute
    }

    incrementRequestCount() {
        this.metrics.requestCount++;
    }

    recordResponseTime(time) {
        this.metrics.responseTimeTotal += time;
    }

    incrementErrorCount() {
        this.metrics.errorCount++;
    }

    setSocketConnections(count) {
        this.metrics.socketConnections = count;
    }

    incrementKafkaPublished() {
        this.metrics.kafkaPublished++;
    }

    incrementKafkaConsumed() {
        this.metrics.kafkaConsumed++;
    }

    recordDbQuery(time) {
        this.metrics.dbQueries++;
        this.metrics.dbQueryTime += time;
    }

    logMetrics() {
        const avgResponseTime = this.metrics.requestCount > 0 ?
            this.metrics.responseTimeTotal / this.metrics.requestCount : 0;

        const avgDbQueryTime = this.metrics.dbQueries > 0 ?
            this.metrics.dbQueryTime / this.metrics.dbQueries : 0;

        console.log('=== PERFORMANCE METRICS ===');
        console.log(`Requests: ${this.metrics.requestCount}`);
        console.log(`Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
        console.log(`Errors: ${this.metrics.errorCount}`);
        console.log(`Socket Connections: ${this.metrics.socketConnections}`);
        console.log(`Kafka Messages Published: ${this.metrics.kafkaPublished}`);
        console.log(`Kafka Messages Consumed: ${this.metrics.kafkaConsumed}`);
        console.log(`DB Queries: ${this.metrics.dbQueries}`);
        console.log(`Avg DB Query Time: ${avgDbQueryTime.toFixed(2)}ms`);
        console.log('===========================');

        // Reset counters except for connections
        this.metrics.requestCount = 0;
        this.metrics.responseTimeTotal = 0;
        this.metrics.errorCount = 0;
        this.metrics.kafkaPublished = 0;
        this.metrics.kafkaConsumed = 0;
        this.metrics.dbQueries = 0;
        this.metrics.dbQueryTime = 0;
    }
}

module.exports = new MetricsService();