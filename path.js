const express = require('express');
const router = express.Router();

const userRoutes = require('./users/userRoutes');
const adminRoutes  = require('./admin/adminRoutes');
const categoryRoutes =  require('./categories/categoryRoute');
const productRoutes =  require('./item/itemRoute');




router.use('/user', userRoutes);
router.use('/admin',adminRoutes);
router.use('/category',categoryRoutes);
router.use('/product',productRoutes);


module.exports = router;
