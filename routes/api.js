const express = require('express');
const router = express.Router();
const { write, view } = require('../utils/utils');
const { producer } = require('../config/kafka');

router.post('/add', async (req, res) => {
    const { keyID, value } = req.body;
    try {
        await write(keyID, value);
        const message = JSON.stringify({ keyID, value, timestamp: new Date() });
        await producer.send({
            topic: 'gold-price-updates',
            messages: [{ value: message }]
        });
        res.json({ keyID, value });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/get/:keyID', async (req, res) => {
    try {
        const value = await view(req.params.keyID);
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