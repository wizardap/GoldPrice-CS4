const winston = require('winston');
const config = require('../config');

// Tạo logger instance với winston
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

// Thêm log stream cho HTTP requests
logger.stream = {
  write: function(message) {
    logger.info(message.trim());
  }
};

module.exports = logger;