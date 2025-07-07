const mongoose = require('mongoose');

// Separate schema for product images with better organization
const productImageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  alt_text: String,
  image_type: {
    type: String,
    enum: ['main', 'side', 'back', 'detail', 'lifestyle', 'thumbnail'],
    default: 'main'
  },
  is_primary: {
    type: Boolean,
    default: false
  },
  sort_order: {
    type: Number,
    default: 0
  },
  // Image metadata
  width: Number,
  height: Number,
  file_size: Number,
  format: String // jpg, png, webp
});

// Color-specific image collection
const colorImageSchema = new mongoose.Schema({
  color: {
    type: String,
    required: true
  },
  color_code: String, // hex code like #FF0000
  images: [productImageSchema],
  primary_image: String, // URL of the primary image for this color
  thumbnail: String // URL of thumbnail for quick loading
});

// Size schema with detailed information
const sizeSchema = new mongoose.Schema({
  size: {
    type: String,
    required: true
  },
  size_type: {
    type: String,
    enum: ['US', 'EU', 'UK', 'CM', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
    default: 'US'
  },
  measurements: {
    length: Number,
    width: Number,
    height: Number,
    weight: Number
  }
});

// Variant schema optimized for multiple colors and sizes
const productVariantSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique: true
  },
  size: {
    type: String,
    required: true
  },
  color: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  compare_at_price: Number, 
  stock_quantity: {
    type: Number,
    default: 0,
    min: 0
  },
  low_stock_threshold: {
    type: Number,
    default: 5
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'out_of_stock', 'discontinued'],
    default: 'active'
  },
  // Variant-specific attributes
  weight: Number,
  dimensions: {
    length: Number,
    width: Number,
    height: Number
  },
  // Tracking
  reserved_quantity: {
    type: Number,
    default: 0
  }, 
  last_stock_update: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Main Product Schema
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  short_description: {
    type: String,
    trim: true,
    maxlength: 160
  },
  category: {
    type: String,
    required: true
  },
  subcategory: String,
  brand: String,
  base_price: {
    type: Number,
    required: true
  },
  
  // Variants (size/color combinations)
  variants: [productVariantSchema],
  
  // Color-specific image collections
  color_images: [colorImageSchema],
  
  // Available options
  available_colors: [{
    color: String,
    color_code: String,
    color_name: String, // Display name like "Midnight Blue"
    image_count: Number,
    primary_image: String
  }],
  
  available_sizes: [sizeSchema],
  
  // SEO and metadata
  meta_title: String,
  meta_description: String,
  tags: [String],
  
  // Product status
  status: {
    type: String,
    enum: ['active', 'inactive', 'draft', 'archived'],
    default: 'active'
  },
  
  // Analytics
  view_count: {
    type: Number,
    default: 0
  },
  
  // Computed fields
  total_stock: {
    type: Number,
    default: 0
  },
  
  min_price: Number,
  max_price: Number,
  
  // Inventory status
  inventory_status: {
    type: String,
    enum: ['in_stock', 'low_stock', 'out_of_stock', 'pre_order'],
    default: 'in_stock'
  }
}, {
  timestamps: true
});

// Indexes for better performance
productSchema.index({ slug: 1 });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ 'variants.color': 1 });
productSchema.index({ 'variants.size': 1 });
productSchema.index({ 'variants.stock_quantity': 1 });
productSchema.index({ status: 1, createdAt: -1 });

// Pre-save middleware to update computed fields
productSchema.pre('save', function(next) {
  // Update available colors with image counts
  this.available_colors = this.color_images.map(colorImg => ({
    color: colorImg.color,
    color_code: colorImg.color_code,
    color_name: colorImg.color,
    image_count: colorImg.images.length,
    primary_image: colorImg.primary_image || (colorImg.images.length > 0 ? colorImg.images[0].url : null)
  }));
  
  // Update available sizes
  const uniqueSizes = [...new Set(this.variants.map(v => v.size))];
  this.available_sizes = uniqueSizes.map(size => ({
    size: size,
    size_type: 'US' // Default, can be customized
  }));
  
  // Calculate total stock
  this.total_stock = this.variants.reduce((total, variant) => total + variant.stock_quantity, 0);
  
  // Calculate price range
  const prices = this.variants.map(v => v.price);
  this.min_price = Math.min(...prices);
  this.max_price = Math.max(...prices);
  
  // Update inventory status
  if (this.total_stock === 0) {
    this.inventory_status = 'out_of_stock';
  } else if (this.total_stock <= 10) { // Configurable threshold
    this.inventory_status = 'low_stock';
  } else {
    this.inventory_status = 'in_stock';
  }
  
  next();
});

// Virtual for getting images by color
productSchema.virtual('images_by_color').get(function() {
  const imagesByColor = {};
  this.color_images.forEach(colorImg => {
    imagesByColor[colorImg.color] = colorImg.images;
  });
  return imagesByColor;
});

// Method to get available sizes for a specific color
productSchema.methods.getAvailableSizesForColor = function(color) {
  return this.variants
    .filter(variant => variant.color === color && variant.stock_quantity > 0)
    .map(variant => ({
      size: variant.size,
      stock_quantity: variant.stock_quantity,
      price: variant.price,
      is_low_stock: variant.stock_quantity <= variant.low_stock_threshold,
      sku: variant.sku
    }));
};

// Method to get images for a specific color
productSchema.methods.getImagesForColor = function(color) {
  const colorImages = this.color_images.find(ci => ci.color === color);
  return colorImages ? colorImages.images.sort((a, b) => a.sort_order - b.sort_order) : [];
};

// Method to get primary image for each color
productSchema.methods.getPrimaryImages = function() {
  return this.color_images.map(colorImg => ({
    color: colorImg.color,
    primary_image: colorImg.primary_image,
    thumbnail: colorImg.thumbnail
  }));
};

// Static method to find products with low stock
productSchema.statics.findLowStock = function(threshold = 5) {
  return this.find({
    'variants': {
      $elemMatch: {
        $and: [
          { stock_quantity: { $lte: threshold } },
          { stock_quantity: { $gt: 0 } }
        ]
      }
    }
  });
};

module.exports = mongoose.model('Product', productSchema);