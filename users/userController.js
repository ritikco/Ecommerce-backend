const User = require('../users/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Banner = require('../banner/bannerModel');
const Category = require('../categories/categoryModel');
const Product = require('../item/itemModel');


exports.signUp = async (req, res) => {
  try {
    const { email, fullname, phone, password } = req.body;

    // Validate required fields
    if (!email || !fullname || !phone || !password) {
      return res.send({
        statusCode: 400,
        success: false,
        message: "All fields are required",
        result: {}
      });
    }

    // Check if phone already exists (in any user)
 const phoneExists = await User.findOne({ phone, otpVerified: true });
    if (phoneExists) {
      return res.send({
        statusCode: 409,
        success: false,
        message: "Phone number is already registered",
        result: {}
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });

    if (existingUser && existingUser.otpVerified) {
      return res.send({
        statusCode: 409,
        success: false,
        message: "Email is already registered",
        result: {}
      });
    }

    // Generate OTP
    const otp = Math.floor(10000 + Math.random() * 90000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    if (existingUser) {
      // Update existing unverified user
      existingUser.fullname = fullname;
      existingUser.phone = phone;
      existingUser.password = password;
      existingUser.otp = otp;
      existingUser.otpExpires = otpExpires;
      await existingUser.save();
    } else {
      // Create new unverified user
      await User.create({
        email,
        fullname,
        phone,
        password,
        otp,
        otpExpires,
        otpVerified: false
      });
    }

    // In production: use nodemailer to send this OTP
    console.log(`OTP sent to ${email}: ${otp}`);

    return res.send({
      statusCode: 200,
      success: true,
      message: "OTP sent successfully",
      result: { email ,
        otp
       }
    });

  } catch (err) {
    console.error('Signup Step 1 error:', err);
    return res.send({
      statusCode: 500,
      success: false,
      message: "Server error while sending OTP",
      result: {}
    });
  }
};

exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: 'Email is required' });

    const otp = Math.floor(10000 + Math.random() * 90000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    let user = await User.findOne({ email });

    if (user) {
      user.otp = otp;
      user.otpExpires = otpExpires;
      user.otpVerified = false;
      await user.save();
    } else {
      user = await User.create({ email, otp, otpExpires, otpVerified: false });
    }

    // TODO: Use nodemailer to send real email
    console.log(`OTP sent to ${email}: ${otp}`);

    return res.status(200).json({
      statusCode : 200,
      success : true,
      message : "Otp send successFully",
      result : {otp}
    })
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ message: 'Server error while sending OTP' });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        message: "Invalid or expired OTP"
      });
    }

    // Hash the password only now (finalize account)
    const hashedPassword = await bcrypt.hash(user.password, 10);
    user.password = hashedPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    user.otpVerified = true;

    // Generate token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '90d' }
    );
    user.token = token;

    await user.save();

    return res.status(200).json({
      statusCode: 200,
      success: true,
      message: "OTP verified. User registered successfully",
      result: {
        user: {
          id: user._id,
          email: user.email,
          fullname: user.fullname,
          phone: user.phone,
          coordinates: user.coordinates
        },
        token
      }
    });

  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: "Server error while verifying OTP"
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    // Validate input
    if (!email || !password) {
      return res.send({
        statusCode: 400,
        success: false,
        message: "Email and password are required",
        result: {}
      });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.send({
        statusCode: 404,
        success: false,
        message: "User not found",
        result: {}
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.send({
        statusCode: 401,
        success: false,
        message: "Invalid password",
        result: {}
      });
    }

console.log("hereeeeeeee",rememberMe);


    const remember = rememberMe === true || rememberMe === 'true';
    const expiresIn = remember ? '90d' : '3d';
    console.log("expireeeeee",expiresIn);
    

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn }
    );

    user.token = token;
    user.rememberMe = rememberMe; 
    await user.save();

    return res.send({
      statusCode: 200,
      success: true,
      message: "Login successful",
      result: {
        user: {
          id: user._id,
          email: user.email,
          fullname: user.fullname,
          phone: user.phone,
          coordinates: user.coordinates,
          rememberMe: user.rememberMe
        },
        token
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.send({
      statusCode: 500,
      success: false,
      message: "Server error during login",
      result: {}
    });
  }
};


exports.verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.send({
        statusCode: 400,
        success: false,
        message: "Email and OTP are required",
        result: {}
      });
    }

    const user = await User.findOne({ email });

    if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
      return res.send({
        statusCode: 400,
        success: false,
        message: "Invalid or expired OTP",
        result: {}
      });
    }

    // Clear OTP
    user.otp = undefined;
    user.otpExpires = undefined;

    const securityToken = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 10 * 60 * 1000; // 10 mins

    user.resetSecurityToken = securityToken;
    user.resetSecurityTokenExpires = expires;

    await user.save();

    return res.send({
      statusCode: 200,
      success: true,
      message: "OTP verified successfully. Use the security token to reset password.",
      result: {
        email,
        securityToken
      }
    });

  } catch (err) {
    return res.send({
      statusCode: 500,
      success: false,
      message: "Server error during OTP verification",
      result: err.message
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword, securityToken } = req.body;

    if (!email || !newPassword || !securityToken) {
      return res.send({
        statusCode: 400,
        success: false,
        message: "Email, new password, and security token are required",
        result: {}
      });
    }

    const user = await User.findOne({ email });

    if (
      !user ||
      user.resetSecurityToken !== securityToken ||
      user.resetSecurityTokenExpires < Date.now()
    ) {
      return res.send({
        statusCode: 401,
        success: false,
        message: "Invalid or expired security token",
        result: {}
      });
    }

    // Hash & update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    // Invalidate security token
    user.resetSecurityToken = undefined;
    user.resetSecurityTokenExpires = undefined;

    await user.save();

    return res.send({
      statusCode: 200,
      success: true,
      message: "Password reset successfully",
      result: { email }
    });

  } catch (err) {
    console.error("Reset password error:", err);
    return res.send({
      statusCode: 500,
      success: false,
      message: "Server error while resetting password",
      result: {}
    });
  }
};

exports.saveRecentSearch = async (req, res) => {
  try {
    const { search } = req.body;
    const userId = req.token._id;

    if (!search || typeof search !== 'string') {
      return res.send({ 
        statusCode : 400,
         success: false,
          message: 'Invalid search term',
        result : {}
       });
    }

    const user = await User.findById(userId);
    if(!user){
      return res.send({
        statusCode : 400,
        success :false ,
        message : "user not found",
        result : {}
      })
    }


    let updatedSearches = user.recentSearches.filter(item => item !== search);
    updatedSearches.unshift(search);


    if (updatedSearches.length > 5) {
      updatedSearches = updatedSearches.slice(0, 5);
    }

    user.recentSearches = updatedSearches;
    await user.save();

    res.send({
      statusCode : 200,
      success: true,
      message: 'Recent search saved successfully',
      data: user.recentSearches
    });

  } catch (error) {
    console.error("Save Search Error:", error);
    res.status(500).send({ success: false, message: 'Server error' });
  }
};


exports.getDashboard = async (req, res) => {
  try {
    const userId = req.token._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.send({
        statusCode: 400,
        success: false,
        message: "User not found",
        result: {}
      });
    }

    const { search } = req.body;

    // ✅ Active banners
    const banners = await Banner.find({ status: 'active' });

    // ✅ Trending categories based on search
    const categories = await Category.find({
      isTrending: true,
      name: { $regex: search, $options: 'i' }
    });

    // ✅ Searched products (based on current input)
    const searchedProducts = await Product.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    })
      .select('name color_images ratings base_price')
      .limit(10);

    // ✅ Recent Category Products
// ✅ Recent Category Products (from full recent history)
let recentCategoryProducts = [];

if (user.recentCategoryHistory && user.recentCategoryHistory.length > 0) {
  const recentCategoryIds = user.recentCategoryHistory.map(item => item.categoryId);

  recentCategoryProducts = await Product.find({
    category: { $in: recentCategoryIds }
  })
    .sort({ createdAt: -1 })
    .select('name color_images ratings base_price categoryId')
    .limit(10)
    .populate('category', 'name'); // Optional: to get category names
}

// ✅ Fetch recent categories separately
let recentCategories = [];

if (user.recentCategoryHistory && user.recentCategoryHistory.length > 0) {
  const recentCategoryIds = user.recentCategoryHistory.map(item => item.categoryId);

  recentCategories = await Category.find({ _id: { $in: recentCategoryIds } });
}


    // ✅ Recent Search Products (from stored search terms)
    let recentSearchProducts = [];

    if (user.recentSearches && user.recentSearches.length > 0) {
      recentSearchProducts = await Product.find({
        $or: user.recentSearches.map(term => ({
          name: { $regex: term, $options: 'i' }
        }))
      })
        .select('name color_images ratings base_price')
        .limit(10);
    }

    // ✅ New Arrivals
    const newArrivals = await Product.find()
      .sort({ createdAt: -1 })
      .select('name color_images.primary_image ratings min_price')
      .limit(10);

    return res.send({
      statusCode: 200,
      success: true,
      message: "Dashboard data fetched successfully",
      result: {
        banners,
        categories,
        searchedProducts,
        recentSearchProducts,
        recentCategoryProducts,
         recentCategories,
        newArrivals
      }
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

exports.updateRecentCategory = async (req, res) => {
  try {
    const userId = req.token._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    const { categoryId } = req.body;

    if (!categoryId) {
      return res.status(400).send({
        success: false,
        message: "categoryId is required",
      });
    }

    const existing = user.recentCategoryHistory.find(
      item => item.categoryId.toString() === categoryId.toString()
    );

    if (existing) {
      existing.viewedAt = new Date();
      existing.count += 1;
    } else {
      user.recentCategoryHistory.push({
        categoryId,
        viewedAt: new Date(),
        count: 1,
      });
    }

    // Sort by latest viewed and limit to last 5 entries
    user.recentCategoryHistory.sort((a, b) => b.viewedAt - a.viewedAt);
    user.recentCategoryHistory = user.recentCategoryHistory.slice(0, 5);

    await user.save();

    return res.status(200).send({
      success: true,
      message: "Recent category updated successfully",
      recentCategoryHistory: user.recentCategoryHistory
    });

  } catch (error) {
    return res.status(500).send({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

