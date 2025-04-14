const mongoose = require('mongoose');

const goldItemSchema = new mongoose.Schema({
    type: { type: String, required: true },
    buy: { type: Number, required: true },
    sell: { type: Number, required: true }
});

// Bỏ goldBrandSchema vì không còn cần nữa (brand giờ là keyID)
const goldPriceSchema = new mongoose.Schema({
    keyID: { type: String, required: true, unique: true, index: true }, // keyID sẽ là tên hãng (DOJI, PNJ, SJC)
    items: [goldItemSchema], // Trực tiếp chứa các items mà không qua brands
    timestamp: { type: Date, default: Date.now, index: true }
});

// Add TTL index if you want to automatically expire old data
// goldPriceSchema.index({ timestamp: 1 }, { expireAfterSeconds: 86400 }); // Uncomment to expire after 24 hours

module.exports = mongoose.model('GoldPrice', goldPriceSchema);