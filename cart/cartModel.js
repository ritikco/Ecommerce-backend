// models/cartModel.js
const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
products: [
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    count: {
      type: Number,
      default: 1
    },
    selectedColor: {
      type: String,
      required: null
    },
    selectedSize: {
      type: String,
      required: null
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }
]

  },
  { timestamps: true } 
);

module.exports = mongoose.model('Cart', cartSchema);
