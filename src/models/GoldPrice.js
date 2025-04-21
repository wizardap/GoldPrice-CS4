const mongoose = require('mongoose');
const { dbCircuitBreaker } = require('../utils/db');

/**
 * Schema định nghĩa cấu trúc của một sản phẩm vàng 
 * @description
 * Lưu trữ thông tin chi tiết của một sản phẩm vàng:
 * - type: Loại vàng (VD: SJC, nhẫn 24K, v.v.)
 * - sellPrice: Giá bán từ vendor đến khách hàng
 * - buyPrice: Giá mua từ khách hàng vào vendor
 */
const ProductSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    trim: true
  },
  sellPrice: {
    type: Number,
    required: true
  },
  buyPrice: {
    type: Number,
    required: true
  }
}, { _id: false });

/**
 * Schema chính định nghĩa cấu trúc của một bản ghi giá vàng
 * @description
 * Lưu trữ thông tin giá vàng từ một vendor tại một thời điểm:
 * - keyID: Định danh của vendor (người bán vàng)
 * - products: Mảng các sản phẩm vàng với giá tương ứng
 * - timestamp: Thời điểm cập nhật giá
 * 
 * Có các indexes để tối ưu truy vấn:
 * - keyID: Để tìm kiếm theo vendor
 * - timestamp: Để truy vấn theo thời gian
 * - Compound index (keyID, timestamp): Để truy vấn lịch sử giá của một vendor
 */
const GoldPriceSchema = new mongoose.Schema({
  keyID: {
    type: String,
    required: true,
    index: true, // Đánh index để tìm kiếm nhanh hơn
    trim: true
  },
  products: {
    type: [ProductSchema],
    required: true,
    validate: {
      validator: function (v) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'Phải có ít nhất một sản phẩm'
    }
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true // Đánh index theo timestamp để truy vấn theo thời gian
  }
}, {
  timestamps: true, // Tự động thêm createdAt và updatedAt
  collection: 'goldprices'
});

// Tạo index ghép để hỗ trợ truy vấn phân tích xu hướng
GoldPriceSchema.index({ keyID: 1, timestamp: -1 });

/**
 * Virtual property để trả về thông tin tóm tắt của bản ghi
 * @returns {Object} Thông tin tóm tắt bao gồm key, số lượng sản phẩm và timestamp
 * @description 
 * Cung cấp một cách để lấy thông tin tóm tắt mà không cần truy vấn lại database
 */
GoldPriceSchema.virtual('summary').get(function () {
  return {
    key: this.keyID,
    productsCount: this.products.length,
    timestamp: this.timestamp
  };
});

/**
 * Lấy bản ghi giá vàng mới nhất theo keyID
 * @param {string} keyID - Định danh của vendor cần truy vấn
 * @returns {Promise<Document>} Bản ghi giá vàng mới nhất của vendor
 * @description
 * Phương thức tĩnh để lấy giá vàng mới nhất của một vendor dựa trên keyID.
 * Sử dụng sort để sắp xếp theo timestamp giảm dần và lấy bản ghi đầu tiên.
 */
GoldPriceSchema.statics.getLatestByKey = async function (keyID) {
  return this.findOne({ keyID }).sort({ timestamp: -1 });
};

/**
 * Lấy lịch sử giá vàng theo keyID và khoảng thời gian
 * @param {string} keyID - Định danh của vendor cần truy vấn
 * @param {Date} fromDate - Thời gian bắt đầu (có thể null)
 * @param {Date} toDate - Thời gian kết thúc (có thể null)
 * @param {number} page - Số trang (mặc định: 1)
 * @param {number} limit - Số lượng kết quả trên mỗi trang (mặc định: 20)
 * @returns {Promise<Array<Document>>} Mảng các bản ghi giá vàng phù hợp với điều kiện
 * @description
 * Phương thức tĩnh để lấy lịch sử giá vàng của một vendor theo khoảng thời gian.
 * Sử dụng circuit breaker để tránh quá tải database khi có nhiều truy vấn cùng lúc.
 * Tối ưu hóa truy vấn bằng cách:
 * - Chỉ lấy các trường cần thiết (keyID, products, timestamp)
 * - Loại bỏ _id để giảm kích thước dữ liệu
 * - Sử dụng lean() để trả về plain JavaScript objects thay vì Mongoose documents
 * - Phân trang để tránh truy vấn quá nhiều dữ liệu cùng lúc
 */
GoldPriceSchema.statics.getHistoryByKey = async function (keyID, fromDate, toDate, limit = 20, page = 1) {
  try {
    return await dbCircuitBreaker.exec(
      async (key, from, to, lim, pg) => {
        const query = { keyID: key };
        if (from || to) {
          query.timestamp = {};
          if (from) query.timestamp.$gte = from;
          if (to) query.timestamp.$lte = to;
        }

        const skip = (pg - 1) * lim;

        return this.find(query, {
          keyID: 1,
          'products.type': 1,
          'products.sellPrice': 1,
          'products.buyPrice': 1,
          timestamp: 1,
          _id: 0 // Loại bỏ _id để giảm kích thước dữ liệu
        })
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(lim)
          .lean() // Tối ưu hóa bằng cách trả về plain JavaScript objects
          .exec();
      },
      keyID, fromDate, toDate, limit, page
    );
  } catch (error) {
    logger.error(`DB query error in getHistoryByKey: ${error.message}`);
    throw error; // Rethrow để controller xử lý
  }
};

// Export model
module.exports = mongoose.model('GoldPrice', GoldPriceSchema);