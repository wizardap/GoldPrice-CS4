const express = require('express');
const router = express.Router();
const goldPriceController = require('../controllers/goldPriceController');
const rateLimit = require('express-rate-limit');
const kafkaService = require('../services/kafka');

/**
 * Rate limiter middleware để bảo vệ API khỏi các cuộc tấn công DoS
 * @description
 * Giới hạn số lượng requests từ một IP trong một khoảng thời gian:
 * - windowMs: 15 phút
 * - max: 100 requests mỗi IP trong mỗi window
 * Trả về lỗi 429 (Too Many Requests) khi vượt quá giới hạn
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // giới hạn 100 request mỗi IP trong 15 phút
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Quá nhiều request, vui lòng thử lại sau.' }
});

/**
 * Định nghĩa các routes cho API giá vàng
 * 
 * @route POST /add
 * @description Thêm/cập nhật giá vàng mới
 * @access Public
 */
router.post('/add', goldPriceController.addPrice);

/**
 * @route GET /get/:id
 * @description Lấy giá vàng mới nhất theo keyID (vendor)
 * @param {string} id - keyID của vendor
 * @access Public
 */
router.get('/get/:id', goldPriceController.getLatestPrice);

/**
 * @route GET /history/:id
 * @description Lấy lịch sử giá vàng theo keyID và khoảng thời gian
 * @param {string} id - keyID của vendor
 * @param {string} [from] - Thời gian bắt đầu (ISO format)
 * @param {string} [to] - Thời gian kết thúc (ISO format)
 * @param {number} [limit=20] - Số lượng kết quả tối đa
 * @param {number} [page=1] - Trang kết quả
 * @access Public
 */
router.get('/history/:id', goldPriceController.getPriceHistory);

/**
 * @route GET /vendors
 * @description Lấy danh sách tất cả các vendors (keyIDs) trong hệ thống
 * @access Public
 */
router.get('/vendors', goldPriceController.getVendorsList);

/**
 * @route GET /metrics/kafka
 * @description Lấy thông tin metrics của Kafka để giám sát hệ thống
 * @returns {Object} Metrics của Kafka bao gồm topic offsets, consumer offsets, và lag
 * @access Public
 */
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