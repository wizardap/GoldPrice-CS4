const logger = require('../utils/logger'); // hoặc đường dẫn đúng đến module logger

class CircuitBreaker {
    constructor(fn, options = {}) {
        this.fn = fn;
        this.state = "CLOSED";
        this.failureThreshold = options.failureThreshold || 5;
        this.resetTimeout = options.resetTimeout || 10000;
        this.failureCount = 0;
        this.successThreshold = options.successThreshold || 1; // Thêm: số lần thành công cần thiết trong HALF_OPEN
        this.successCount = 0;
        this.lastFailureTime = null;
        this.name = options.name || 'unnamed';
        this.logger = options.logger || console;
    }

    async exec(...args) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
                this.state = 'HALF_OPEN';
                this.failureCount = 0; // Reset failure count khi chuyển sang HALF_OPEN
                this.successCount = 0; // Reset success count
                this.logger.info(`Circuit ${this.name} transitioned from OPEN to HALF_OPEN`);
            } else {
                throw new Error(`Circuit ${this.name} is OPEN`);
            }
        }

        try {
            const result = await this.fn(...args);

            if (this.state === 'HALF_OPEN') {
                this.successCount++;
                if (this.successCount >= this.successThreshold) {
                    this.reset();
                    this.logger.info(`Circuit ${this.name} recovered and is now CLOSED`);
                }
            }
            return result;
        } catch (error) {
            this.failureCount++;
            this.lastFailureTime = Date.now();

            // Trong HALF_OPEN, lỗi đầu tiên mở lại circuit
            if (this.state === 'HALF_OPEN') {
                this.state = 'OPEN';
                this.logger.warn(`Circuit ${this.name} returned to OPEN state after failure in HALF_OPEN`);
            }
            // Trong CLOSED, quá số lỗi threshold thì mở circuit
            else if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
                this.state = 'OPEN';
                this.logger.warn(`Circuit ${this.name} is now OPEN after ${this.failureCount} failures`);
            }

            throw error;
        }
    }

    reset() {
        this.failureCount = 0;
        this.successCount = 0;
        this.state = 'CLOSED';
    }
}

// Trong utils/circuitBreaker.js - cấu hình riêng cho history query
const historyCircuitBreaker = new CircuitBreaker(
  async (operation, ...args) => await operation(...args),
  {
    name: 'mongodb-history-queries',
    failureThreshold: 3,       // Ngưỡng thấp hơn
    resetTimeout: 5000,        // Thời gian ngắn hơn
    successThreshold: 1,
    timeout: 10000,            // Thêm timeout cho query
    logger: logger
  }
);

module.exports = { CircuitBreaker, historyCircuitBreaker };