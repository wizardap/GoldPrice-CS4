const requestLogger = (req, res, next) => {
    const start = Date.now();

    // Log khi request bắt đầu
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Request started`);

    // Lưu method và url ban đầu
    const originalMethod = req.method;
    const originalUrl = req.url;

    // Ghi đè phương thức end của response
    const originalEnd = res.end;
    res.end = function (...args) {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${originalMethod} ${originalUrl} - Response ${res.statusCode} - ${duration}ms`);
        originalEnd.apply(res, args);
    };

    next();
};

module.exports = { requestLogger };