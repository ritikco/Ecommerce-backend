const express = require('express');
const router = express.Router();
const {verifyToken} = require('../middleware/jwt');
const { parseFormData , singleImageUpload} = require('../middleware/multer');

const categoryController = require('./categoryController');


router.post('/create-category', singleImageUpload , verifyToken, categoryController.createCategory);


module.exports = router;
