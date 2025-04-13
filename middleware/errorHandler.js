class ErrorHandler {
    static handleError(err, req, res, next) {
        console.error('Error:', err.stack);

        const statusCode = err.statusCode || 500;
        res.status(statusCode).json({
            status: 'error',
            message: err.message || 'Internal Server Error',
            ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
        });
    }

    static notFound(req, res) {
        res.status(404).json({
            status: 'error',
            message: `Route not found: ${req.originalUrl}`
        });
    }
}

module.exports = ErrorHandler;