const express = require('express');
const router = express.Router();
const goldPriceController = require('../controllers/goldPriceController');
const rateLimit = require('express-rate-limit');

// Rate limiting để tránh tấn công DoS
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // giới hạn 100 request mỗi IP trong 15 phút
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Quá nhiều request, vui lòng thử lại sau.' }
});

// Các routes cho API
router.post('/add', apiLimiter, goldPriceController.addPrice);
router.get('/get/:id', goldPriceController.getLatestPrice);
router.get('/history/:id', goldPriceController.getPriceHistory);
router.get('/vendors', goldPriceController.getVendorsList);

module.exports = router;