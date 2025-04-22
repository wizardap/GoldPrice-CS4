const rateLimit = require('express-rate-limit');

// API rate limiter - áp dụng cho tất cả API endpoints
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 phút
    max: 100, // 100 requests mỗi phút
    message: { error: 'Too many requests, please try again later.' }
});

// Write operations rate limiter - áp dụng cho thao tác ghi
const writeLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 phút
    max: 6, // 6 requests mỗi phút
    message: { error: 'Too many write operations, please try again later.' }
});

module.exports = { apiLimiter, writeLimiter };