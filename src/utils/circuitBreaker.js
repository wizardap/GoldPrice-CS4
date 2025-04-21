const logger = require('../utils/logger');

/**
 * Mẫu thiết kế Circuit Breaker để ngăn chặn lỗi cascade 
 * @class CircuitBreaker
 * @description 
 * Triển khai mẫu thiết kế Circuit Breaker giúp ngăn chặn lỗi cascade khi một service bị lỗi.
 * Hoạt động theo 3 trạng thái: CLOSED (bình thường), OPEN (ngắt), HALF_OPEN (thử lại).
 * Khi số lỗi vượt ngưỡng, circuit chuyển sang OPEN và không cho phép request đi qua.
 * Sau một khoảng thời gian, circuit chuyển sang HALF_OPEN để thử lại một số request.
 * Nếu các request thành công, circuit trở lại CLOSED, nếu thất bại, quay lại OPEN.
 */
class CircuitBreaker {
    /**
     * Khởi tạo Circuit Breaker
     * @param {Function} fn - Function được bảo vệ bởi circuit breaker
     * @param {Object} options - Các tùy chọn cấu hình
     * @param {number} options.failureThreshold - Số lỗi liên tiếp trước khi mở circuit
     * @param {number} options.resetTimeout - Thời gian (ms) trước khi chuyển từ OPEN sang HALF_OPEN
     * @param {number} options.successThreshold - Số lần thành công cần thiết để đóng circuit từ HALF_OPEN
     * @param {string} options.name - Tên của circuit để ghi log
     * @param {Object} options.logger - Logger instance để ghi log
     */
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

    /**
     * Thực thi function được bảo vệ bởi circuit breaker
     * @param {...any} args - Tham số truyền vào function
     * @returns {Promise<any>} - Kết quả của function
     * @throws {Error} - Ném lỗi khi circuit đang OPEN hoặc function thất bại
     * @description
     * Kiểm tra trạng thái của circuit trước khi thực thi function.
     * - Nếu OPEN: Kiểm tra thời gian reset, nếu đủ thì chuyển sang HALF_OPEN, nếu không thì từ chối request
     * - Nếu CLOSED/HALF_OPEN: Thực thi function và cập nhật trạng thái dựa trên kết quả
     */
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

    /**
     * Reset circuit breaker về trạng thái ban đầu (CLOSED)
     * @description Đặt lại các bộ đếm lỗi, bộ đếm thành công và trạng thái về CLOSED
     */
    reset() {
        this.failureCount = 0;
        this.successCount = 0;
        this.state = 'CLOSED';
    }
}

/**
 * Circuit breaker được cấu hình riêng cho các truy vấn lịch sử giá
 * @description
 * Được tối ưu hóa cho các truy vấn lịch sử giá với ngưỡng lỗi thấp hơn
 * và thời gian reset ngắn hơn so với cấu hình mặc định, để cải thiện trải nghiệm người dùng
 * khi truy vấn dữ liệu lịch sử.
 */
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