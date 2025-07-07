const express = require('express');
const router = express.Router();
const {verifyToken} = require('../middleware/jwt');
const { parseFormData ,singleImageUpload , anyFilesUpload} = require('../middleware/multer');

const bannerController = require('./bannerController');


router.post('/create-banner', singleImageUpload , verifyToken, bannerController.addBanner );
// router.post('/get-product', anyFilesUpload , itemController.getProduct);


module.exports = router;
