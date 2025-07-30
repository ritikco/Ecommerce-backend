const express = require('express');
const router = express.Router();
const {verifyToken} = require('../middleware/jwt');
const { parseFormData , anyFilesUpload} = require('../middleware/multer');

const itemController = require('./itemController');


router.post('/create-product', anyFilesUpload , verifyToken, itemController.addProduct);
router.post('/get-product', anyFilesUpload , itemController.getProduct);

router.post('/product-as-per-category', anyFilesUpload ,verifyToken, itemController.getProductAsPerCategory);
router.post('/product-as-per-searching', anyFilesUpload ,verifyToken, itemController.fuzzySearchProducts);


module.exports = router;
