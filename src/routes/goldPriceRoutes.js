const express = require('express');
const router = express.Router();
const goldPriceController = require('../controllers/goldPriceController');
const rateLimit = require('express-rate-limit');
const kafkaService = require('../services/kafka');

// Rate limiting để tránh tấn công DoS
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // giới hạn 100 request mỗi IP trong 15 phút
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Quá nhiều request, vui lòng thử lại sau.' }
});

// Các routes cho API
router.post('/add', goldPriceController.addPrice);
router.get('/get/:id', goldPriceController.getLatestPrice);
router.get('/history/:id', goldPriceController.getPriceHistory);
router.get('/vendors', goldPriceController.getVendorsList);

// Thêm route mới để giám sát Kafka metrics
router.get('/metrics/kafka', async (req, res) => {
  try {
    const metrics = await kafkaService.getKafkaMetrics();
    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Không thể lấy metrics Kafka: ${error.message}`
    });
  }
});

module.exports = router;