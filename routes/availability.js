const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/availability');

// Get available room types for a specific hotel and date range
router.get('/room-types', availabilityController.getAvailableRoomTypes);

// Get available hotels for a specific date range
router.get('/hotels', availabilityController.getAvailableHotels);

module.exports = router; 