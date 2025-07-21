const express = require('express');
const router = express.Router();
const {verifyToken} = require('../middleware/jwt');
const { parseFormData , anyFilesUpload} = require('../middleware/multer');

const cartController = require('./cartController');


router.post('/create-cart', parseFormData , verifyToken, cartController.addCart);
router.get('/get-cart', parseFormData ,verifyToken , cartController.getCart);
router.post('/update-product-quantity', parseFormData , verifyToken, cartController.updateCartQuantity);


module.exports = router;
