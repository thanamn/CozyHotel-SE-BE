const express = require('express');
const {
    getRoomTypes,
    getRoomType,
    createRoomType,
    updateRoomType,
    deleteRoomType,
    getRoomTypesByHotelId
} = require('../controllers/roomTypes');

const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

router.route('/')
    .get(getRoomTypes)
    .post(protect, authorize('admin'), createRoomType);

router.route('/:id')
    .get(getRoomType)
    .put(protect, authorize('admin'), updateRoomType)
    .delete(protect, authorize('admin'), deleteRoomType);

router.route('/hotel/:hotelId').get(getRoomTypesByHotelId);
    
module.exports = router;