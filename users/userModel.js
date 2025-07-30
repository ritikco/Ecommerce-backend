const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  fullname: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  password: {
    type: String
  },
  rememberMe: {
    type: Boolean,
    default: false
  },
  token: {
    type: String,
    default: ''
  },
  otp: {
    type: String
  },
  otpExpires: {
    type: Date
  },
  otpVerified: {
    type: Boolean,
    default: false
  },
    recentSearches: {
    type: [String],  // array of strings
    default: []
  },
    watchlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product"
  }],
recentCategoryHistory: [
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
    count: {
      type: Number,
      default: 1,
    },

  }
],

resetSecurityToken: String,
resetSecurityTokenExpires: Date,
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
