const mongoose = require('mongoose');

// Product schema for gold items
const productSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true
  },
  sellPrice: {
    type: Number,
    required: true
  },
  buyPrice: {
    type: Number,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Main schema for gold sellers
const dataSchema = new mongoose.Schema({
  keyID: {
    type: String,
    required: true,
    unique: true,
    description: 'Name of the gold seller'
  },
  products: [productSchema]
}, {
  timestamps: true
});

const Data = mongoose.model('Data', dataSchema);

module.exports = Data;