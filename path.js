const express = require('express');
const router = express.Router();

const userRoutes = require('./users/userRoutes');
const adminRoutes  = require('./admin/adminRoutes');
const categoryRoutes =  require('./categories/categoryRoute');
const productRoutes =  require('./item/itemRoute');
const bannerRoutes = require('./banner/bannerRoute');




router.use('/user', userRoutes);
router.use('/admin',adminRoutes);
router.use('/category',categoryRoutes);
router.use('/product',productRoutes);
router.use('/banner' , bannerRoutes);


module.exports = router;
