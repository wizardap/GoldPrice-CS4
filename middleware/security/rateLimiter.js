const rateLimit = require('express-rate-limit');

module.exports = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 100, // giới hạn 100 request mỗi IP trong 15 phút
    message: 'Quá nhiều request từ IP này, vui lòng thử lại sau 15 phút'
});