const logger = require("./logger");

/**
 * Thực hiện retry một function với cơ chế exponential backoff
 * @param {Function} fn - Function cần retry khi thất bại
 * @param {number} maxAttempt - Số lần retry tối đa
 * @param {number} baseDelayMs - Thời gian delay cơ sở (ms) cho lần retry đầu tiên
 * @returns {Promise<any>} - Kết quả của function khi thực hiện thành công
 * @throws {Error} - Ném lỗi khi đã vượt quá số lần retry tối đa
 * @description 
 * Thực hiện retry một async function với delay tăng theo cấp số nhân.
 * Mỗi lần retry, thời gian chờ sẽ tăng theo công thức: baseDelayMs * 2^(attempt-1) + jitter
 * Jitter được thêm vào để tránh hiện tượng "thundering herd" khi nhiều requests retry cùng lúc.
 */
function retryWithExponentialBackoff(fn, maxAttempt = 5, baseDelayMs = 1000) {
    let attempt = 1

    const execute = async () => {
        try {
            return await fn();
        }
        catch (error) {
            if (attempt >= maxAttempt) {
                logger.error(`Attempt limit exceed (${maxAttempt}): ${error.message}`);
                throw error;
            }

            const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
            // Thêm jitter chống thundering herd (nhiều retry cùng một thời điểm gây quá tải)
            const jitter = Math.random() * 100;
            logger.warn(`${attempt}/${maxAttempt} retry failed. Wait ${delayMs} ms before next attempt`);
            attempt++;
            await new Promise(resolve => setTimeout(resolve, delayMs + jitter));

            return execute();
        }
    };

    return execute();
}

module.exports = { retryWithExponentialBackoff };