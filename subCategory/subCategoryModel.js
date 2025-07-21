const mongoose = require('mongoose');

const subcategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    image: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'delete'],
      default: 'active'
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subcategory', subcategorySchema);
