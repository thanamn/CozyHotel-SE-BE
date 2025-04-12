const RoomType = require("../models/RoomType");
const Booking = require("../models/Booking");
// @desc    Get all RoomTypes
// @route   GET /api/v1/roomtypes
// @access  Public
exports.getRoomTypes = async (req, res) => {
  try {
    const roomTypes = await RoomType.find();
    res.status(200).json({ success: true, data: roomTypes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get single RoomType
// @route   GET /api/v1/roomtypes/:id
// @access  Public
exports.getRoomType = async (req, res) => {
  try {
    const roomType = await RoomType.findById(req.params.id);
    if (!roomType) {
      return res
        .status(404)
        .json({ success: false, message: "RoomType not found" });
    }
    res.status(200).json({ success: true, data: roomType });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
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
    res.status(400).json({ success: false, message: "Invalid data" });
  }
};

// @desc    Update RoomType
// @route   PUT /api/v1/roomtypes/:id
// @access  Private
exports.updateRoomType = async (req, res) => {
  try {
    const roomType = await RoomType.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!roomType) {
      return res
        .status(404)
        .json({ success: false, message: "RoomType not found" });
    }
    res.status(200).json({ success: true, data: roomType });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Room type name must be unique within the same hotel",
      });
    }
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Delete RoomType
// @route   DELETE /api/v1/roomtypes/:id
// @access  Private
exports.deleteRoomType = async (req, res) => {
  try {
    const roomType = await RoomType.findById(req.params.id);

    if (!roomType) {
      return res
        .status(404)
        .json({ success: false, message: "RoomType not found" });
    }
    
    await Booking.deleteMany({ roomType: req.params.id });
    await RoomType.deleteOne({ _id: req.params.id });

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
