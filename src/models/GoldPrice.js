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
GoldPriceSchema.statics.getHistoryByKey = async function (keyID, fromDate, toDate, page = 1, limit = 20) {
  try {
    return await dbCircuitBreaker.exec(
      async (key, from, to, pg, lim) => {
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
      keyID, fromDate, toDate, page, limit
    );
  } catch (error) {
    logger.error(`DB query error in getHistoryByKey: ${error.message}`);
    throw error; // Rethrow để controller xử lý
  }
};

// Export model
module.exports = mongoose.model('GoldPrice', GoldPriceSchema);