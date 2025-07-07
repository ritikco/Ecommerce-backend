const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  image: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  link: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'delete'],
    default: 'inactive'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Banner', bannerSchema);
