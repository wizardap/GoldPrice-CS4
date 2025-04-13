const express = require('express');
const router = express.Router();
const goldPriceRepository = require('../repositories/goldPriceRepository');
const messageBrokerService = require('../services/messageBrokerService');
const { validateGoldPriceData } = require('../middleware/validation'); // Thêm dòng này

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

// Phần còn lại giữ nguyên
router.get('/get/:keyID', async (req, res, next) => {
    try {
        const result = await goldPriceRepository.findByKey(req.params.keyID);
        if (result !== null) {
            res.json(result);
        } else {
            res.status(404).json({ message: 'Key ID not found' });
        }
    } catch (error) {
        next(error);
    }
});

router.get('/viewer', (req, res) => {
    res.sendFile('viewer.html', { root: __dirname + '/../public' });
});

module.exports = router;