const express = require('express');
const router = express.Router();
const goldPriceRepository = require('../repositories/goldPriceRepository');
const messageBrokerService = require('../services/messageBrokerService');

router.post('/add', async (req, res) => {
    const { keyID, value } = req.body;
    try {
        await goldPriceRepository.save(keyID, value);
        await messageBrokerService.publishMessage({
            keyID,
            value,
            timestamp: new Date()
        });
        res.json({ keyID, value });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/get/:keyID', async (req, res) => {
    try {
        const value = await goldPriceRepository.findByKey(req.params.keyID);
        if (value !== null) {
            res.json({ keyID: req.params.keyID, value });
        } else {
            res.status(404).json({ message: 'Key ID not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/viewer', (req, res) => {
    res.sendFile('viewer.html', { root: __dirname + '/../public' });
});

module.exports = router;