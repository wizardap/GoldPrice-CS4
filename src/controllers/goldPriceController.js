const GoldPrice = require('../models/GoldPrice');
const kafka = require('../services/kafka');
const cache = require('../utils/cache');
const logger = require('../utils/logger');
const { retryWithExponentialBackoff } = require('../utils/retry');

// Cache keys
const CACHE_KEY_PREFIX = 'goldprice:';
const CACHE_TTL = 60; // seconds

/**
 * Thêm/cập nhật giá vàng mới
 */
exports.addPrice = async (req, res) => {
  try {
    const { key, value } = req.body;
    // Convert key to lowercase for consistency
    const normalizedKey = key ? key.toLowerCase() : key;

    if (!normalizedKey || !value || !Array.isArray(value) || value.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Dữ liệu không hợp lệ. Yêu cầu key và mảng value không rỗng. ${normalizedKey}:${value}`
      });
    }

    // --- Thêm Validation cho giá ---
    for (const product of value) {
      if (typeof product.sellPrice !== 'number' || product.sellPrice < 0 ||
        typeof product.buyPrice !== 'number' || product.buyPrice < 0 ||
        !product.type || typeof product.type !== 'string' || product.type.trim() === '') {
        return res.status(400).json({
          success: false,
          message: `Dữ liệu sản phẩm không hợp lệ: ${JSON.stringify(product)}. Yêu cầu type (string không rỗng), sellPrice và buyPrice (số không âm).`
        });
      }
    }
    // --- Kết thúc Validation ---

    // Lưu vào database với key đã được chuyển thành lowercase
    const newPrice = new GoldPrice({
      keyID: normalizedKey,
      products: value, // Dữ liệu đã được validate cơ bản
      timestamp: new Date()
    });

    await newPrice.save();
    logger.info(`Lưu dữ liệu giá vàng thành công cho key: ${normalizedKey}`);

    // Xóa cache lịch sử cho vendor này
    await cache.deleteCachePattern(`history:${normalizedKey}:*`);

    // Lưu vào cache 
    try {
      await cache.setCache(`${CACHE_KEY_PREFIX}${normalizedKey}`, {
        key: normalizedKey,
        value: value,
        timestamp: newPrice.timestamp
      }, CACHE_TTL);
    } catch (error) {
      logger.warn(`Không thể lưu vào cache: ${error.message}`);
    }

    // Publish message đến Kafka - SỬA LẠI
    try {
      // Áp dụng retry ở đây (một nơi duy nhất)
      await retryWithExponentialBackoff(async () => {
        const result = await kafka.publishMessage({
          key: normalizedKey,
          type: 'PRICE_UPDATED',
          value: value,
          timestamp: newPrice.timestamp
        });

        // Nếu circuit breaker mở, publishMessage trả về false -> throw để retry
        if (result === false) {
          throw new Error('Unable to publish message, circuit may be open');
        }

        return result;
      }, 3, 1000);
    } catch (error) {
      logger.error(`Không thể publish message đến Kafka: ${error.message}`);
    }
    res.status(201).json({
      success: true,
      message: 'Thêm giá vàng thành công',
      data: {
        key: normalizedKey,
        timestamp: newPrice.timestamp
      }
    });

  } catch (error) {
    logger.error(`Lỗi khi thêm giá vàng: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
  }
};

/**
 * Lấy giá vàng mới nhất theo key
 */
exports.getLatestPrice = async (req, res) => {
  try {
    // Convert keyID to lowercase for consistency
    const keyID = req.params.id.toLowerCase();

    // Kiểm tra cache trước
    const cachedData = await cache.getCache(`${CACHE_KEY_PREFIX}${keyID}`);

    if (cachedData) {
      logger.info(`Lấy dữ liệu giá vàng từ cache cho key: ${keyID}`);
      return res.status(200).json({
        success: true,
        data: cachedData,
        source: 'cache'
      });
    }

    // Nếu không có trong cache, truy vấn database
    const priceData = await GoldPrice.getLatestByKey(keyID);

    if (!priceData) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy dữ liệu cho key này'
      });
    }

    const result = {
      key: priceData.keyID,
      value: priceData.products,
      timestamp: priceData.timestamp
    };

    // Lưu kết quả vào cache
    await cache.setCache(`${CACHE_KEY_PREFIX}${keyID}`, result, CACHE_TTL);
    logger.info(`Lấy dữ liệu giá vàng từ database cho key: ${keyID}`);

    res.status(200).json({
      success: true,
      data: result,
      source: 'database'
    });

  } catch (error) {
    logger.error(`Lỗi khi lấy giá vàng: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
  }
};

/**
 * Lấy lịch sử giá vàng theo key và khoảng thời gian
 */
exports.getPriceHistory = async (req, res) => {
  try {
    const id = req.params.id.toLowerCase();
    const { from, to, limit = 20, page = 1 } = req.query;
    
    // Tạo cache key dựa vào params
    const cacheKey = `history:${id}:${from || 'null'}:${to || 'null'}:${limit}:${page}`;
    
    // Cache thông tin về lần cập nhật cuối thay vì toàn bộ lịch sử
    const lastUpdateKey = `lastUpdate:${id}`;
    await cache.setCache(lastUpdateKey, { timestamp: new Date() }, 3600);

    // Trong controller, kiểm tra xem có cập nhật mới không
    const lastUpdate = await cache.getCache(lastUpdateKey);
    const cachedData = await cache.getCache(cacheKey);
    if (cachedData && lastUpdate && new Date(cachedData.timestamp) >= new Date(lastUpdate.timestamp)) {
      // Cache vẫn hợp lệ
      return res.status(200).json({
        success: true,
        count: cachedData.length,
        data: cachedData,
        source: 'cache'
      });
    } else {
      // Làm mới cache
      // Chuyển đổi chuỗi thời gian thành đối tượng Date
      const fromDate = from ? new Date(from) : null;
      const toDate = to ? new Date(to) : null;

      // Lấy lịch sử từ database
      const history = await GoldPrice.getHistoryByKey(
        id,
        fromDate,
        toDate,
        parseInt(limit)
      );

      // Chuyển đổi định dạng dữ liệu trả về
      const result = history.map(item => ({
        key: item.keyID,
        value: item.products,
        timestamp: item.timestamp
      }));

      // Sử dụng TTL ngắn hơn cho dữ liệu gần đây
      const now = new Date();
      const oneDayAgo = new Date(now);
      oneDayAgo.setDate(now.getDate() - 1);
      const oneHourAgo = new Date(now);
      oneHourAgo.setHours(now.getHours() - 1);

      let ttl;
      if (from && new Date(from) < oneDayAgo) {
        ttl = 3600; // 1 giờ cho dữ liệu cũ hơn 1 ngày
      } else if (from && new Date(from) < oneHourAgo) {
        ttl = 180; // 3 phút cho dữ liệu từ 1 giờ đến 1 ngày
      } else {
        ttl = 60; // 1 phút cho dữ liệu rất mới (dưới 1 giờ)
      }
      await cache.setCache(cacheKey, result, ttl);
      
      res.status(200).json({
        success: true,
        count: result.length,
        data: result,
        source: 'database'
      });
    }

  } catch (error) {
    logger.error(`Lỗi khi lấy lịch sử giá vàng: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
  }
};

/**
 * Lấy danh sách các vendor (key) có trong hệ thống
 */
exports.getVendorsList = async (req, res) => {
  try {
    // Lấy danh sách distinct keyID từ database
    const vendors = await GoldPrice.distinct('keyID');

    res.status(200).json({
      success: true,
      count: vendors.length,
      data: vendors
    });

  } catch (error) {
    logger.error(`Lỗi khi lấy danh sách vendors: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
  }
};