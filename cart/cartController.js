const Cart = require('./cartModel');
const User = require('../users/userModel');
const Product = require('../item/itemModel');


exports.addCart = async (req, res) => {
  try {
    const userId = req.token._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.send({
        statusCode: 400,
        success: false,
        message: "Unauthorised access",
        result: {}
      });
    }

    const { productId, selectedColor, selectedSize } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.send({
        statusCode: 404,
        success: false,
        message: "Product not found",
        result: {}
      });
    }

    const requiresColor = product.available_colors && product.available_colors.length > 0;
    const requiresSize = product.available_sizes && product.available_sizes.length > 0;

    if ((requiresColor && !selectedColor) || (requiresSize && !selectedSize)) {
      return res.send({
        statusCode: 400,
        success: false,
        message: "Please select required size and/or color",
        result: {}
      });
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      // Create new cart
      cart = new Cart({
        user: userId,
        products: [{
          product: productId,
          count: 1,
          selectedColor: selectedColor || null,
          selectedSize: selectedSize || null
        }]
      });
    } else {
      // Check for same product with same color and size
      const existing = cart.products.find(
        item =>
          item.product.toString() === productId.toString() &&
          item.selectedColor === (selectedColor || null) &&
          item.selectedSize === (selectedSize || null)
      );

      if (existing) {
        existing.count += 1;
        existing.addedAt = new Date();
      } else {
        cart.products.push({
          product: productId,
          count: 1,
          selectedColor: selectedColor || null,
          selectedSize: selectedSize || null
        });
      }
    }

    await cart.save();

    return res.send({
      statusCode: 200,
      success: true,
      message: "product added to cart successfully",
      result: { cart }
    });

  } catch (error) {
    return res.send({
      statusCode: 500,
      success: false,
      message: "Internal server error",
      result: error.message
    });
  }
};


exports.getCart = async (req, res) => {
  try {
    const userId = req.token._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.send({
        statusCode: 400,
        success: false,
        message: "Unauthorised access",
        result: {}
      });
    }

    const cart = await Cart.findOne({ user: userId }).populate('products.product');

    if (!cart || cart.products.length === 0) {
      return res.send({
        statusCode: 200,
        success: true,
        message: "Cart is empty",
        result: { cart: [] }
      });
    }

    const cartData = cart.products.map(item => ({
      _id: item._id,
      product: {
        _id: item.product._id,
        name: item.product.name,
        base_price: item.product.base_price,
        color_images: item.product.color_images?.filter(c => c.color === item.selectedColor),
      },
      count: item.count,
      selectedColor: item.selectedColor,
      selectedSize: item.selectedSize,
      addedAt: item.addedAt
    }));

    return res.send({
      statusCode: 200,
      success: true,
      message: "Cart fetched successfully",
      result: { cart: cartData }
    });

  } catch (error) {
    return res.send({
      statusCode: 500,
      success: false,
      message: "Internal server error",
      result: error.message
    });
  }
};

exports.updateCartQuantity = async (req, res) => {
  try {
    const userId = req.token._id;
    const { productId, selectedColor, selectedSize, action } = req.body; 
    // 1 for incrrease and 0 for decrease

    if (!productId || !action) {
      return res.send({
        statusCode: 400,
        success: false,
        message: "productId and action are required",
        result: {}
      });
    }

    if (!["1", "0"].includes(action)) {
      return res.send({
        statusCode: 400,
        success: false,
        message: "Invalid action. Use 'increase' or 'decrease'",
        result: {}
      });
    }

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.send({
        statusCode: 404,
        success: false,
        message: "Cart not found",
        result: {}
      });
    }

    // Find matching cart item
    const cartItem = cart.products.find(
      item =>
        item.product.toString() === productId &&
        item.selectedColor === (selectedColor || null) &&
        item.selectedSize === (selectedSize || null)
    );

    if (!cartItem) {
      return res.send({
        statusCode: 404,
        success: false,
        message: "Cart item not found",
        result: {}
      });
    }

    // Apply the action
    if (action === "1") {
      cartItem.count += 1;
    } else if (action === "0") {
      cartItem.count -= 1;
      // If count becomes 0, remove the item from cart
      if (cartItem.count <= 0) {
        cart.products = cart.products.filter(
          item =>
            !(
              item.product.toString() === productId &&
              item.selectedColor === (selectedColor || null) &&
              item.selectedSize === (selectedSize || null)
            )
        );
      }
    }

    await cart.save();

    return res.send({
      statusCode: 200,
      success: true,
      message: "Cart quantity updated successfully",
      result: { cart }
    });

  } catch (error) {
    return res.send({
      statusCode: 500,
      success: false,
      message: "Internal server error",
      result: error.message
    });
  }
};

exports.removeCartItem = async (req, res) => {
  try {
    const userId = req.token._id;
    const { productId, selectedColor, selectedSize } = req.body;

    if (!productId) {
      return res.send({
        statusCode: 400,
        success: false,
        message: "productId is required",
        result: {}
      });
    }

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.send({
        statusCode: 404,
        success: false,
        message: "Cart not found",
        result: {}
      });
    }

    // Filter out the matching item
    const filteredProducts = cart.products.filter(
      item =>
        !(
          item.product.toString() === productId &&
          item.selectedColor === (selectedColor || null) &&
          item.selectedSize === (selectedSize || null)
        )
    );

    // If nothing changed, item was not found
    if (filteredProducts.length === cart.products.length) {
      return res.send({
        statusCode: 404,
        success: false,
        message: "Product not found in cart",
        result: {}
      });
    }

    cart.products = filteredProducts;
    await cart.save();

    return res.send({
      statusCode: 200,
      success: true,
      message: "Product removed from cart successfully",
      result: { cart }
    });

  } catch (error) {
    return res.send({
      statusCode: 500,
      success: false,
      message: "Internal server error",
      result: error.message
    });
  }
};
 
