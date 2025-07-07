const express = require('express');
const router = express.Router();
const {verifyToken} = require('../middleware/jwt');
const { parseFormData } = require('../middleware/multer');

const adminController = require('./adminController');


router.post('/create-admin',parseFormData, verifyToken, adminController.createAdmin);
router.post('/create-superAdmin',parseFormData, adminController.createSuperAdmin);
router.post('/admin-login',parseFormData, adminController.loginAdmin);

module.exports = router;
