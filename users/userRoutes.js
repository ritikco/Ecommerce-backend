const express = require('express');
const router = express.Router();
const userController = require('../users/userController');
const { parseFormData, singleImageUpload } = require('../middleware/multer');
const {verifyToken} = require('../middleware/jwt');


router.post('/signup', singleImageUpload, userController.signUp);
router.post('/login', singleImageUpload, userController.login);
router.post('/send-otp', parseFormData, userController.sendOtp);
router.post('/verify-otp', parseFormData, userController.verifyOtp);
router.post('/verify-reset-otp', parseFormData, userController.verifyResetOtp);
router.post('/reset-password', parseFormData, userController.resetPassword);
router.post('/get-dashboard', parseFormData,verifyToken , userController.getDashboard);
router.post('/save-recentSearch', parseFormData,verifyToken , userController.saveRecentSearch);

module.exports = router;
