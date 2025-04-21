const winston = require('winston');
const config = require('../config');

/**
 * Tạo logger instance với winston để quản lý logs trong ứng dụng
 * @description
 * Cấu hình logger với nhiều transports khác nhau:
 * - Console transport: Hiển thị logs với màu sắc trên console để dễ đọc
 * - File transport (error.log): Ghi lại các errors vào file riêng
 * - File transport (combined.log): Ghi tất cả các logs vào một file tổng hợp
 * Format logs bao gồm timestamp, level, và message với stack trace cho errors
 */
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'goldprice-service' },
  transports: [
    // Ghi log ra console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
      )
    }),
    // Ghi log ra file
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

/**
 * Stream interface cho morgan HTTP request logger
 * @description
 * Cho phép morgan HTTP request logger sử dụng winston logger
 * để ghi lại tất cả HTTP requests vào cùng một hệ thống logging
 */
logger.stream = {
  write: function (message) {
    logger.info(message.trim());
  }
};

module.exports = logger;