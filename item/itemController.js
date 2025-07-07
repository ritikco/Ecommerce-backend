const Product = require('./itemModel');
const mongoose = require('mongoose');
const slugify = require('slugify'); // npm install slugify

function buildColorImages(req) {
  const colorImages = {};

  // Check if color_images is sent as a JSON string or object
  if (req.body.color_images) {
    let parsedColorImages;
    
    // Parse if it's a string, otherwise use as-is
    if (typeof req.body.color_images === 'string') {
      try {
        parsedColorImages = JSON.parse(req.body.color_images);
      } catch (e) {
        console.error('Error parsing color_images:', e);
        parsedColorImages = [];
      }
    } else {
      parsedColorImages = req.body.color_images;
    }

    // Initialize color images from parsed data
    if (Array.isArray(parsedColorImages)) {
      parsedColorImages.forEach((colorImg, index) => {
        colorImages[index] = {
          color: colorImg.color || '',
          color_code: colorImg.color_code || null,
          images: []
        };
      });
    }
  } else {
    // Original logic for form data fields
    // Step 1: Initialize each color group from text fields
    for (const key in req.body) {
      const match = key.match(/^color_images\[(\d+)]\[color]$/);
      if (match) {
        const index = match[1];
        const color = req.body[key];
        const color_code = req.body[`color_images[${index}][color_code]`] || null;

        colorImages[index] = {
          color,
          color_code,
          images: []
        };
      }
    }
  }

  // Step 2: Attach uploaded files to their respective color image groups
  if (req.files && req.files.length > 0) {
    req.files.forEach(file => {
      const match = file.fieldname.match(/^color_images\[(\d+)]\[images]\[(\d+)]\[url]$/);
      if (!match) return;

      const colorIndex = match[1];
      const imageIndex = match[2];

      // Parse related fields
      const is_primary = req.body[`color_images[${colorIndex}][images][${imageIndex}][is_primary]`] === 'true';
      const sort_order = parseInt(req.body[`color_images[${colorIndex}][images][${imageIndex}][sort_order]`] || '0');
      const alt_text = req.body[`color_images[${colorIndex}][images][${imageIndex}][alt_text]`] || '';
      const image_type = req.body[`color_images[${colorIndex}][images][${imageIndex}][image_type]`] || 'main';

      // Fallback in case color wasn't initialized in step 1
      if (!colorImages[colorIndex]) {
        colorImages[colorIndex] = {
          color: '',
          color_code: null,
          images: []
        };
      }

      // Push the image entry with all required fields
      colorImages[colorIndex].images.push({
        url: `/public/image/${file.filename}`,
        alt_text,
        image_type,
        is_primary,
        sort_order,
        // Add file metadata if available
        width: file.width || undefined,
        height: file.height || undefined,
        file_size: file.size || undefined,
        format: file.mimetype ? file.mimetype.split('/')[1] : undefined
      });
    });
  }

  // Filter out any color images that don't have actual images
  // This prevents creating color entries with empty image arrays
  const filteredColorImages = Object.values(colorImages).filter(colorImg => 
    colorImg.images.length > 0 || (colorImg.color && colorImg.color.trim() !== '')
  );

  return filteredColorImages;
}

const addProduct = async (req, res) => {
  try {
    let {
      name,
      description,
      short_description,
      category,
      subcategory,
      brand,
      base_price,
      variants,
      meta_title,
      meta_description,
      tags
    } = req.body;

    // Parse stringified arrays
    if (typeof variants === 'string') {
      variants = JSON.parse(variants);
    }

    if (typeof tags === 'string') {
      tags = JSON.parse(tags);
    }

    // Validate required fields
    if (!name || !category || !base_price || !Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, category, base_price, variants'
      });
    }

    const slug = slugify(name, { lower: true, strict: true });

    const existingProduct = await Product.findOne({ slug });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product with this name already exists'
      });
    }

    // Validate variants - ensure all required fields are present
    const processedVariants = variants.map((variant, index) => {
      if (!variant.sku || !variant.size || !variant.color || !variant.price) {
        throw new Error(`Variant ${index} is missing required fields: sku, size, color, price`);
      }
      
      return {
        ...variant,
        stock_quantity: variant.stock_quantity || 0,
        status: variant.stock_quantity > 0 ? 'active' : 'out_of_stock'
      };
    });

    // Build color_images with URLs from req.files
    const color_images = buildColorImages(req);

    console.log('DEBUG: Built color_images', JSON.stringify(color_images, null, 2));

    // Enhanced validation for color_images
    for (let i = 0; i < color_images.length; i++) {
      const ci = color_images[i];
      
      // Check if color is provided
      if (!ci.color || ci.color.trim() === '') {
        return res.status(400).json({
          success: false,
          message: `Missing color in color_images[${i}]. Please provide a color name.`,
          bodyKeys: Object.keys(req.body),
          builtColorImage: ci,
          hint: 'Make sure to include color field in your color_images data'
        });
      }

      // Check if all images have required url field
      for (let j = 0; j < ci.images.length; j++) {
        const img = ci.images[j];
        if (!img.url) {
          return res.status(400).json({
            success: false,
            message: `Missing url in color_images[${i}].images[${j}]`,
            builtColorImage: ci,
            hint: 'All images must have a valid url field'
          });
        }
      }
    }

    // Process color_images (sort + set primary image/thumbnail)
    const processedColorImages = color_images.map(colorImg => {
      const sortedImages = colorImg.images.sort((a, b) => a.sort_order - b.sort_order);
      const primaryImage = sortedImages.find(img => img.is_primary) || sortedImages[0];

      return {
        ...colorImg,
        images: sortedImages,
        primary_image: primaryImage ? primaryImage.url : null,
        thumbnail: primaryImage ? primaryImage.url : null
      };
    });

    const product = new Product({
      name,
      slug,
      description,
      short_description,
      category,
      subcategory,
      brand,
      base_price,
      variants: processedVariants,
      color_images: processedColorImages,
      meta_title: meta_title || name,
      meta_description: meta_description || short_description,
      tags: tags || [],
      status: 'active'
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });

  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
};



// Get Product with Optimized Image Loading
const getProduct = async (req, res) => {
  try {
    const { id } = req.body;
    const { include_all_images = false } = req.query;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }
    
    let product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Increment view count
    product.view_count += 1;
    await product.save();
    
    // Prepare response data
    const responseData = {
      id: product._id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      short_description: product.short_description,
      category: product.category,
      subcategory: product.subcategory,
      brand: product.brand,
      base_price: product.base_price,
      min_price: product.min_price,
      max_price: product.max_price,
      total_stock: product.total_stock,
      inventory_status: product.inventory_status,
      
      // Color information with primary images
      available_colors: product.available_colors,
      available_sizes: product.available_sizes.map(s => s.size),
      
      // Variants with stock information
      variants: product.variants.map(variant => ({
        id: variant._id,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        price: variant.price,
        compare_at_price: variant.compare_at_price,
        stock_quantity: variant.stock_quantity,
        is_available: variant.stock_quantity > 0,
        is_low_stock: variant.stock_quantity <= variant.low_stock_threshold && variant.stock_quantity > 0,
        status: variant.status
      })),
      
      // Images - if include_all_images is false, only return primary images
      color_images: include_all_images === 'true' ? 
        product.color_images : 
        product.color_images.map(colorImg => ({
          color: colorImg.color,
          color_code: colorImg.color_code,
          primary_image: colorImg.primary_image,
          thumbnail: colorImg.thumbnail,
          image_count: colorImg.images.length
        })),
      
      // SEO data
      meta_title: product.meta_title,
      meta_description: product.meta_description,
      tags: product.tags,
      
      // Timestamps
      created_at: product.createdAt,
      updated_at: product.updatedAt
    };
    
    res.json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: error.message
    });
  }
};

// Get Images for Specific Color (with pagination)
const getImagesForColor = async (req, res) => {
  try {
    const { product_id, color } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    if (!mongoose.Types.ObjectId.isValid(product_id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }
    
    const product = await Product.findById(product_id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    const colorImages = product.color_images.find(ci => ci.color === color);
    
    if (!colorImages) {
      return res.status(404).json({
        success: false,
        message: 'Color not found for this product'
      });
    }
    
    const sortedImages = colorImages.images.sort((a, b) => a.sort_order - b.sort_order);
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedImages = sortedImages.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: {
        color,
        color_code: colorImages.color_code,
        primary_image: colorImages.primary_image,
        images: paginatedImages,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total_images: sortedImages.length,
          total_pages: Math.ceil(sortedImages.length / parseInt(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching images',
      error: error.message
    });
  }
};

// Add Images to Specific Color
const addImagesToColor = async (req, res) => {
  try {
    const { product_id, color } = req.params;
    const { images } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(product_id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }
    
    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Images array is required'
      });
    }
    
    const product = await Product.findById(product_id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Find or create color images entry
    let colorImagesIndex = product.color_images.findIndex(ci => ci.color === color);
    
    if (colorImagesIndex === -1) {
      // Create new color entry
      product.color_images.push({
        color,
        color_code: req.body.color_code || null,
        images: [],
        primary_image: null,
        thumbnail: null
      });
      colorImagesIndex = product.color_images.length - 1;
    }
    
    // Add new images
    const currentImages = product.color_images[colorImagesIndex].images;
    const maxSortOrder = currentImages.length > 0 ? Math.max(...currentImages.map(img => img.sort_order)) : 0;
    
    const newImages = images.map((image, index) => ({
      ...image,
      sort_order: image.sort_order || (maxSortOrder + index + 1)
    }));
    
    product.color_images[colorImagesIndex].images.push(...newImages);
    
    // Update primary image if not set or if new primary is specified
    const newPrimaryImage = newImages.find(img => img.is_primary);
    if (newPrimaryImage || !product.color_images[colorImagesIndex].primary_image) {
      product.color_images[colorImagesIndex].primary_image = newPrimaryImage ? 
        newPrimaryImage.url : 
        (product.color_images[colorImagesIndex].images[0] ? product.color_images[colorImagesIndex].images[0].url : null);
    }
    
    await product.save();
    
    res.json({
      success: true,
      message: 'Images added successfully',
      data: {
        color,
        total_images: product.color_images[colorImagesIndex].images.length,
        added_images: newImages.length
      }
    });
    
  } catch (error) {
    console.error('Error adding images:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding images',
      error: error.message
    });
  }
};

// Update Image Order for Color
const updateImageOrder = async (req, res) => {
  try {
    const { product_id, color } = req.params;
    const { image_order } = req.body; // Array of image IDs in desired order
    
    if (!mongoose.Types.ObjectId.isValid(product_id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }
    
    const product = await Product.findById(product_id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    const colorImagesIndex = product.color_images.findIndex(ci => ci.color === color);
    
    if (colorImagesIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Color not found for this product'
      });
    }
    
    // Update sort order based on provided array
    image_order.forEach((imageId, index) => {
      const imageIndex = product.color_images[colorImagesIndex].images.findIndex(
        img => img._id.toString() === imageId
      );
      if (imageIndex !== -1) {
        product.color_images[colorImagesIndex].images[imageIndex].sort_order = index + 1;
      }
    });
    
    await product.save();
    
    res.json({
      success: true,
      message: 'Image order updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating image order:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating image order',
      error: error.message
    });
  }
};

// Delete Specific Image
const deleteImage = async (req, res) => {
  try {
    const { product_id, color, image_id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(product_id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }
    
    const product = await Product.findById(product_id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    const colorImagesIndex = product.color_images.findIndex(ci => ci.color === color);
    
    if (colorImagesIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Color not found for this product'
      });
    }
    
    const imageIndex = product.color_images[colorImagesIndex].images.findIndex(
      img => img._id.toString() === image_id
    );
    
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
    
    // Remove the image
    const removedImage = product.color_images[colorImagesIndex].images[imageIndex];
    product.color_images[colorImagesIndex].images.splice(imageIndex, 1);
    
    // Update primary image if the deleted image was primary
    if (product.color_images[colorImagesIndex].primary_image === removedImage.url) {
      const remainingImages = product.color_images[colorImagesIndex].images;
      product.color_images[colorImagesIndex].primary_image = remainingImages.length > 0 ? 
        remainingImages[0].url : null;
    }
    
    await product.save();
    
    res.json({
      success: true,
      message: 'Image deleted successfully',
      data: {
        remaining_images: product.color_images[colorImagesIndex].images.length
      }
    });
    
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting image',
      error: error.message
    });
  }
};

// Get Product Summary (for listing pages - optimized)
const getProductSummary = async (req, res) => {
  try {
    const { 
      category, 
      brand, 
      min_price, 
      max_price, 
      in_stock_only,
      page = 1, 
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;
    
    // Build filter
    let filter = { status: 'active' };
    
    if (category) filter.category = category;
    if (brand) filter.brand = new RegExp(brand, 'i');
    if (min_price || max_price) {
      filter.base_price = {};
      if (min_price) filter.base_price.$gte = parseFloat(min_price);
      if (max_price) filter.base_price.$lte = parseFloat(max_price);
    }
    if (in_stock_only === 'true') {
      filter.inventory_status = { $in: ['in_stock', 'low_stock'] };
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Sort
    const sortOptions = {};
    sortOptions[sort_by] = sort_order === 'asc' ? 1 : -1;
    
    // Optimized query - only return essential fields
    const products = await Product.find(filter)
      .select('name slug base_price min_price max_price inventory_status available_colors total_stock')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Product.countDocuments(filter);
    
    // Format response with primary images only
    const productsWithImages = products.map(product => {
      const productObj = product.toObject();
      
      // Get primary images for each color
      const primaryImages = productObj.available_colors.map(color => ({
        color: color.color,
        primary_image: color.primary_image,
        thumbnail: color.primary_image // Can be optimized thumbnail
      }));
      
      return {
        ...productObj,
        primary_images: primaryImages
      };
    });
    
    res.json({
      success: true,
      data: productsWithImages,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total_pages: Math.ceil(total / parseInt(limit)),
        total_items: total
      }
    });
    
  } catch (error) {
    console.error('Error fetching product summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
};

module.exports = {
  addProduct,
  getProduct,
  getImagesForColor,
  addImagesToColor,
  updateImageOrder,
  deleteImage,
  getProductSummary
};