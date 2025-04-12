const RoomType = require('../models/RoomType');

// @desc    Get all RoomTypes
// @route   GET /api/v1/roomtypes
// @access  Public
exports.getRoomTypes = async (req, res) => {
    try {
        const roomTypes = await RoomType.find();
        res.status(200).json({ success: true, data: roomTypes });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get single RoomType
// @route   GET /api/v1/roomtypes/:id
// @access  Public
exports.getRoomType = async (req, res) => {
    try {
        const roomType = await RoomType.findById(req.params.id);
        if (!roomType) {
            return res.status(404).json({ success: false, message: 'RoomType not found' });
        }
        res.status(200).json({ success: true, data: roomType });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Create new RoomType
// @route   POST /api/v1/roomtypes
// @access  Private
exports.createRoomType = async (req, res) => {
    try {
        const roomType = await RoomType.create(req.body);
        res.status(201).json({ success: true, data: roomType });
    } catch (err) {
        console.error(err);
        res.status(400).json({ success: false, message: 'Invalid data' });
    }
};