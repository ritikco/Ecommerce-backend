const Category = require('./categoryModel');
const Admin = require('../admin/adminModel');

exports.createCategory = async (req, res) => {
  try {
    const { name, isTrending } = req.body;
    const image = req.file?.filename; 

    console.log(name , image , isTrending);
    

    if (!name || !image) {
      return res.status(400).send({
        statusCode: 400,
        success: false,
        message: "Name and image are required fields",
        result: {}
      });
    }

    const newCategory = new Category({
      name: name.trim(),
      image,
      isTrending: isTrending === 'true' 
    });

    await newCategory.save();

    return res.status(201).send({
      statusCode: 201,
      success: true,
      message: "Category created successfully",
      result: newCategory
    });

  } catch (error) {
    return res.status(500).send({
      statusCode: 500,
      success: false,
      message: "Internal server error",
      result: error.message
    });
  }
};


