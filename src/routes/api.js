// API routes for the Gold Price application
const express = require('express');
const router = express.Router();
const goldPriceController = require('../controllers/goldPriceController');
const { apiLimiter, writeLimiter } = require('../middleware/rateLimiter');
const { validateGoldPriceUpdate, validateGoldTypeParam } = require('../middleware/validator');

// Add or update gold price - với rate limiting và validation
router.post('/add', validateGoldPriceUpdate, goldPriceController.updateGoldPrice);

// Get gold price by type - với rate limiting và validation
router.get('/get/:id', validateGoldTypeParam, goldPriceController.getGoldPrice);

// Thêm health check endpoint vào API routes
router.get('/health', (req, res) => {
    const healthStatus = {
        status: 'UP',
        timestamp: new Date().toISOString(),
        services: {
            database: goldPriceService.initialized ? 'UP' : 'DOWN',
            cache: cacheService.connected ? 'UP' : 'DOWN',
            kafka: kafkaService.connected ? 'UP' : 'DOWN'
        }
    };

    // Tính toán overall status
    const servicesDown = Object.values(healthStatus.services)
        .filter(status => status === 'DOWN').length;

    if (servicesDown > 0) {
        healthStatus.status = 'DEGRADED';
        return res.status(200).json(healthStatus);
    }

    return res.status(200).json(healthStatus);
});

module.exports = router;