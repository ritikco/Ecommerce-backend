const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
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
    isTrending: {
      type: Boolean,
      default: false
    },
      allowedFilters: {
      type: [String], 
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
