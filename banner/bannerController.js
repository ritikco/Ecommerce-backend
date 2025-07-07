const Admin = require('../admin/adminModel');
const Banner = require('./bannerModel');

exports.addBanner = async (req, res) => {
  try {
    const adminId = req.token._id;
    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.send({
        statusCode: 400,
        success: false,
        message: "Unauthorized access",
        result: {}
      });
    }

    const { name, link } = req.body;

    if (!name || !req.file) {
      return res.send({
        statusCode: 400,
        success: false,
        message: "Name and image are required",
        result: {}
      });
    }

    const imagePath = `/public/image/${req.file.filename}`;

    const banner = new Banner({
      name: name,
      image: imagePath,
      link: link,
      status: "active"
    });

    await banner.save();

    return res.send({
      statusCode: 200,
      success: true,
      message: "Banner created successfully",
      result: banner
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


