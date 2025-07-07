const Admin = require("./adminModel");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

exports.createAdmin = async (req, res) => {
  try {
    const adminId = req.token._id;
    const admin = await Admin.findOne({ _id: adminId, isSuperAdmin: true });

    if (!admin) {
      return res.send({
        statusCode: 400,
        success: false,
        message: "Super Admin not found",
        result: {},
      });
    }

    const { name, email, phone, password } = req.body;

    // Validate fields
    if (!name || !email || !phone || !password) {
      return res.send({
        statusCode: 400,
        success: false,
        message: "All fields are required",
        result: {},
      });
    }

    // Check for existing admin with same email or phone
    const existingAdmin = await Admin.findOne({ $or: [{ email }, { phone }] });
    if (existingAdmin) {
      return res.send({
        statusCode: 400,
        success: false,
        message: "Admin with this email or phone already exists",
        result: {},
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin
    const newAdmin = new Admin({
      name,
      email,
      phone,
      password: hashedPassword,
    });

    await newAdmin.save();

    return res.send({
      statusCode: 201,
      success: true,
      message: "New admin created successfully",
      result: {
        _id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        phone: newAdmin.phone,
      },
    });
  } catch (error) {
    console.error("Create admin error:", error.message);
    return res.send({
      statusCode: 500,
      success: false,
      message: "Server error",
      result: {},
    });
  }
};

exports.createSuperAdmin = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.send({
        statusCode: 400,
        success: false,
        message: "All fields are required",
        result: {},
      });
    }

    // Check if a Super Admin already exists
    const existingSuperAdmin = await Admin.findOne({ isSuperAdmin: true });
    if (existingSuperAdmin) {
      return res.send({
        statusCode: 400,
        success: false,
        message: "Super Admin already exists",
        result: {},
      });
    }

    // Check if email or phone already exists
    const existingAdmin = await Admin.findOne({ $or: [{ email }, { phone }] });
    if (existingAdmin) {
      return res.send({
        statusCode: 400,
        success: false,
        message: "Admin with this email or phone already exists",
        result: {},
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Super Admin
    const newSuperAdmin = new Admin({
      name,
      email,
      phone,
      password: hashedPassword,
      isSuperAdmin: true,
    });

    await newSuperAdmin.save();

    return res.send({
      statusCode: 201,
      success: true,
      message: "Super Admin created successfully",
      result: {
        _id: newSuperAdmin._id,
        name: newSuperAdmin.name,
        email: newSuperAdmin.email,
        phone: newSuperAdmin.phone,
        isSuperAdmin: newSuperAdmin.isSuperAdmin,
      },
    });
  } catch (error) {
    return res.send({
      statusCode: 500,
      success: false,
      message: "Server error",
      result: error.message,
    });
  }
};

exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for email and password
    if (!email || !password) {
      return res.send({
        statusCode: 400,
        success: false,
        message: "Email and password are required",
        result: {}
      });
    }

    // Find admin by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.send({
        statusCode: 400,
        success: false,
        message: "Invalid email or password",
        result: {}
      });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.send({
        statusCode: 400,
        success: false,
        message: "Invalid email or password",
        result: {}
      });
    }

    // Generate JWT token valid for 30 days
    const token = jwt.sign(
      { id: admin._id, email : email},
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Send success response
    return res.send({
      statusCode: 200,
      success: true,
      message: "Login successful",
      result: {
        token,
        admin: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          phone: admin.phone,
          isSuperAdmin: admin.isSuperAdmin
        }
      }
    });

  } catch (error) {
    return res.send({
      statusCode: 500,
      success: false,
      message: "Server error",
      result: error.message
    });
  }
};
