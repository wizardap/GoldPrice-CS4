const mongoose = require('mongoose');
const { dbCircuitBreaker } = require('../utils/db');

// Định nghĩa schema cho sản phẩm (nested document)
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

// Định nghĩa schema chính cho GoldPrice
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

// Virtual để trả về thông tin tóm tắt
GoldPriceSchema.virtual('summary').get(function () {
  return {
    key: this.keyID,
    productsCount: this.products.length,
    timestamp: this.timestamp
  };
});

// Phương thức tĩnh để lấy giá mới nhất theo keyID
GoldPriceSchema.statics.getLatestByKey = async function (keyID) {
  return this.findOne({ keyID }).sort({ timestamp: -1 });
};

// Phương thức tĩnh để lấy lịch sử giá theo keyID và khoảng thời gian
GoldPriceSchema.statics.getHistoryByKey = async function (keyID, fromDate, toDate, limit) {
  try {
    return await dbCircuitBreaker.exec(
      async (key, from, to, lim) => {
        const query = { keyID: key };
        if (from || to) {
          query.timestamp = {};
          if (from) query.timestamp.$gte = from;
          if (to) query.timestamp.$lte = to;
        }

        return this.find(query)
          .sort({ timestamp: -1 })
          .limit(lim)
          .exec();
      },
      keyID, fromDate, toDate, limit
    );
  } catch (error) {
    logger.error(`DB query error in getHistoryByKey: ${error.message}`);
    throw error; // Rethrow để controller xử lý
  }
};

// Export model
module.exports = mongoose.model('GoldPrice', GoldPriceSchema);