const express = require('express');
const {
    getRoomTypes,
    getRoomType,
    createRoomType,
} = require('../controllers/roomTypes');

const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

router.route('/')
    .get(getRoomTypes)
    .post(protect, authorize('admin'), createRoomType);

router.route('/:id')
    .get(getRoomType)
    
module.exports = router;