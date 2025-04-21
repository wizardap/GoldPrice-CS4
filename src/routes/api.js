// API routes for the Gold Price application
const express = require('express');
const router = express.Router();
const goldPriceController = require('../controllers/goldPriceController');

// Add or update gold price
router.post('/add', goldPriceController.updateGoldPrice);

// Get gold price by type (e.g., SJC, DOJI)
router.get('/get/:id', goldPriceController.getGoldPrice);

// Get all available gold types
router.get('/types', goldPriceController.getAllGoldTypes);

// Get historical gold prices
router.get('/history/:id', goldPriceController.getGoldPriceHistory);

module.exports = router;