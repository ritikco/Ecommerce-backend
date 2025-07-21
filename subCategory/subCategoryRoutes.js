const express = require('express');
const router = express.Router();
const {verifyToken} = require('../middleware/jwt');
const { parseFormData , singleImageUpload} = require('../middleware/multer');

const SubcategoryController = require('./subCategoryController');


router.post('/create-SubCategory', singleImageUpload , verifyToken,SubcategoryController.addSubCategory );


module.exports = router;
