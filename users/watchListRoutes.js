const express = require('express');
const router = express.Router();
const watchlistController = require('./watchListController');
const { parseFormData, singleImageUpload } = require('../middleware/multer');
const {verifyToken} = require('../middleware/jwt');


router.post('/add-watchlist',verifyToken , parseFormData , watchlistController.addToWatchlist);
router.get('/get-watchlist',verifyToken , parseFormData , watchlistController.getWatchlist);



module.exports = router;
