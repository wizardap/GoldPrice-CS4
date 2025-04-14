const express = require('express');
const router = express.Router();
const goldPriceRepository = require('../repositories/goldPriceRepository');
const messageBrokerService = require('../services/messageBrokerService');
const { validateGoldPriceData } = require('../middleware/validation');

// Áp dụng middleware validation
router.post('/add', validateGoldPriceData, async (req, res, next) => {
    const { keyID, data } = req.body;
    try {
        await goldPriceRepository.save(keyID, data);
        await messageBrokerService.publishMessage({
            keyID,
            data,
            timestamp: new Date()
        });
        res.json({ keyID, data });
    } catch (error) {
        next(error);
    }
});

// ADD: Input sanitization for URL parameters
router.get('/get/:keyID', async (req, res, next) => {
    try {
        // Sanitize the keyID parameter
        const keyID = String(req.params.keyID).toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');

        if (!keyID) {
            return res.status(400).json({ message: 'Invalid key ID format' });
        }

        const result = await goldPriceRepository.findByKey(keyID);
        if (result !== null) {
            res.json(result);
        } else {
            res.status(404).json({ message: 'Key ID not found' });
        }
    } catch (error) {
        next(error);
    }
});

// Thêm route để lấy tất cả dữ liệu các hãng
router.get('/get-all', async (req, res, next) => {
    try {
        const results = await goldPriceRepository.findAll();
        if (results && results.length > 0) {
            res.json(results);
        } else {
            res.status(404).json({ message: 'No gold price data found' });
        }
    } catch (error) {
        next(error);
    }
});

// FIX: Correct route order to prevent conflicts
// Route for viewing all brands
router.get('/viewer/all', (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
    res.sendFile('viewer.html', { root: __dirname + '/../public' });
});

// Route for viewing specific brand (needs to come after /viewer/all)
router.get('/viewer/:keyID', (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
    res.sendFile('viewer.html', { root: __dirname + '/../public' });
});

module.exports = router;