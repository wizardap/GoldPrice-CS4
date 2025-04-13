const mongoose = require('mongoose');

const goldItemSchema = new mongoose.Schema({
    type: { type: String, required: true },
    buy: { type: Number, required: true },
    sell: { type: Number, required: true }
});

const goldBrandSchema = new mongoose.Schema({
    name: { type: String, required: true },
    items: [goldItemSchema]
});

const goldPriceSchema = new mongoose.Schema({
    keyID: { type: String, required: true, unique: true },
    brands: [goldBrandSchema],
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GoldPrice', goldPriceSchema);