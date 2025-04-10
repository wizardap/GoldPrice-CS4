const mongoose = require('mongoose');

const goldPriceSchema = new mongoose.Schema({
    keyID: { type: String, required: true, unique: true },
    value: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GoldPrice', goldPriceSchema);